import { IBasketModel, IProductModel } from '../types';
import { CSS_CLASSES, TEMPLATES, EVENTS } from '../utils/constants';
import {
	cloneTemplate,
	setText,
	addListener,
	removeListener,
	formatPrice,
} from '../utils/utils';
import { EventEmitter } from '../components/base/events';

export class BasketView {
	protected element: HTMLElement;
	protected list: HTMLElement;
	protected totalElement: HTMLElement;
	protected button: HTMLButtonElement | null = null;
	protected events: EventEmitter;

	constructor(events: EventEmitter) {
		this.events = events;
		const template = cloneTemplate(TEMPLATES.BASKET);
		this.element = template.firstElementChild as HTMLElement;
		this.list = this.element.querySelector(`.${CSS_CLASSES.BASKET_LIST}`)!;
		this.totalElement = this.element.querySelector(
			`.${CSS_CLASSES.BASKET_PRICE}`
		)!;
		this.button = this.element.querySelector(`.${CSS_CLASSES.BUTTON}`);
		this.bindEvents();
	}

	/**
	 * Привязать события
	 */
	protected bindEvents(): void {
		// Клик по кнопке оформления заказа
		if (this.button) {
			addListener(this.button, 'click', this.handleOrderClick.bind(this));
		}

		// Обработка удаления товаров из корзины
		addListener(this.element, 'click', this.handleItemClick.bind(this));
	}

	/**
	 * Обработчик клика по кнопке оформления заказа
	 */
	protected handleOrderClick(event: Event): void {
		this.events.emit(EVENTS.ORDER_START);
	}

	/**
	 * Обработчик клика по элементам корзины
	 */
	protected handleItemClick(event: Event): void {
		const target = event.target as HTMLElement;
		const deleteButton = target.closest(
			`.${CSS_CLASSES.BASKET_ITEM_DELETE}`
		) as HTMLElement | null;

		if (!deleteButton) return;

		// Пытаемся взять productId напрямую с кнопки
		const productId = deleteButton.getAttribute('data-id');
		if (productId) {
			this.events.emit(EVENTS.PRODUCT_REMOVE, { productId });
			return;
		}

		// Фолбэк: определяем по data-index контейнера
		const item = deleteButton.closest(`.${CSS_CLASSES.BASKET_ITEM}`);
		if (!item) return;
		const index = item.getAttribute('data-index');
		if (!index) return;
		const productIndex = parseInt(index);
	}

	/**
	 * Обновить список товаров
	 */
	updateItems(items: IProductModel[]): void {
		this.renderBasket(items);
	}

	/**
	 * Обновить общую стоимость
	 */
	updateTotal(total: number): void {
		setText(this.totalElement, formatPrice(total));
	}

	/**
	 * Обновить счетчик товаров
	 */
	updateCount(count: number): void {
		if (this.button) {
			this.button.disabled = count === 0;
		}
	}

	/**
	 * Рендер списка товаров
	 */
	protected renderBasket(items: IProductModel[]): void {
		// Очищаем список
		this.list.innerHTML = '';

		if (items.length === 0) {
			// Показываем сообщение о пустой корзине
			const emptyMessage = document.createElement('p');
			emptyMessage.textContent = 'Корзина пуста';
			emptyMessage.style.textAlign = 'center';
			emptyMessage.style.padding = '20px';
			this.list.appendChild(emptyMessage);
		} else {
			// Добавляем товары
			items.forEach((item, index) => {
				const itemElement = this.createBasketItem(item, index);
				this.list.appendChild(itemElement);
			});
		}
	}

	/**
	 * Создать элемент товара в корзине
	 */
	protected createBasketItem(
		product: IProductModel,
		index: number
	): HTMLElement {
		const template = cloneTemplate(TEMPLATES.CARD_BASKET);
		const item = template.querySelector(
			`.${CSS_CLASSES.BASKET_ITEM}`
		) as HTMLElement;

		// Устанавливаем индекс
		item.setAttribute('data-index', index.toString());

		// Устанавливаем заголовок
		const title = item.querySelector(
			`.${CSS_CLASSES.CARD_TITLE}`
		) as HTMLElement;
		if (title) {
			setText(title, product.title);
		}

		// Устанавливаем цену
		const price = item.querySelector(
			`.${CSS_CLASSES.CARD_PRICE}`
		) as HTMLElement;
		if (price) {
			setText(price, formatPrice(product.price));
		}

		// Устанавливаем номер
		const indexElement = item.querySelector(
			`.${CSS_CLASSES.BASKET_ITEM_INDEX}`
		) as HTMLElement;
		if (indexElement) {
			setText(indexElement, (index + 1).toString());
		}

		// Проставляем явный id на кнопку удаления и делаем кнопку type="button"
		const deleteButton = item.querySelector(
			`.${CSS_CLASSES.BASKET_ITEM_DELETE}`
		) as HTMLElement;
		if (deleteButton) {
			deleteButton.setAttribute('data-id', product.id);
			if (deleteButton instanceof HTMLButtonElement) {
				deleteButton.type = 'button';
			}
		}
		return item;
	}

	/**
	 * Рендер компонента
	 */
	render(): HTMLElement {
		return this.element;
	}

	/**
	 * Уничтожить компонент
	 */
	destroy(): void {
		if (this.button) {
			removeListener(this.button, 'click', this.handleOrderClick.bind(this));
		}
		removeListener(this.element, 'click', this.handleItemClick.bind(this));
	}
}
