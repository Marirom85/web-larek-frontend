import { IProductModel } from '../../types';
import { CSS_CLASSES, TEMPLATES, EVENTS } from '../../utils/constants';
import {
	cloneTemplate,
	setText,
	addListener,
	removeListener,
	formatPrice,
} from '../../utils/utils';
import { EventEmitter } from './events';

export class Basket {
	protected element: HTMLElement;
	protected list: HTMLElement;
	protected totalElement: HTMLElement;
	protected button: HTMLButtonElement | null = null;
	protected items: IProductModel[] = [];
	protected total = 0;
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
	}

	/**
	 * Обработчик клика по кнопке оформления заказа
	 */
	protected handleOrderClick(event: Event): void {
		if (this.items.length > 0) {
			this.events.emit(EVENTS.ORDER_START);
		}
	}


	/**
	 * Обновить корзину
	 */
	updateBasket(items: IProductModel[]): void {
		this.items = items;
		this.renderBasket();
	}

	/**
	 * Обновить общую стоимость
	 */
	updateTotal(total: number): void {
		this.total = total;
		setText(this.totalElement, formatPrice(this.total));
	}

	/**
	 * Рендер списка товаров
	 */
	protected renderBasket(): void {
		// Очищаем список
		this.list.innerHTML = '';

		if (this.items.length === 0) {
			// Показываем сообщение о пустой корзине
			const emptyMessage = document.createElement('p');
			emptyMessage.textContent = 'Корзина пуста';
			emptyMessage.style.textAlign = 'center';
			emptyMessage.style.padding = '20px';
			this.list.appendChild(emptyMessage);
		} else {
			// Добавляем товары
			this.items.forEach((item, index) => {
				const itemElement = this.createBasketItem(item, index);
				this.list.appendChild(itemElement);
			});
		}

		// Добавляем скролл если много товаров
		if (this.items.length >= 4) {
			this.list.style.maxHeight = '414px';
			this.list.style.overflowY = 'auto';
		} else {
			this.list.style.maxHeight = '';
			this.list.style.overflowY = '';
		}

		// Обновляем состояние кнопки
		if (this.button) {
			this.button.disabled = this.items.length === 0;
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
			// Добавляем обработчик клика напрямую на кнопку
			addListener(deleteButton, 'click', () => {
				this.events.emit(EVENTS.PRODUCT_REMOVE, { productId: product.id });
			});
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
		// Event listeners на кнопки удаления будут автоматически удалены при очистке innerHTML
	}
}
