import { ISuccess } from '../../types';
import { CSS_CLASSES, TEMPLATES, EVENTS, MESSAGES } from '../../utils/constants';
import {
	cloneTemplate,
	setText,
	addListener,
	removeListener,
	formatPrice,
} from '../../utils/utils';
import { EventEmitter } from './events';

export class Success implements ISuccess {
	protected element: HTMLElement;
	protected total = 0;
	protected orderId: string | null = null;
	protected closeButton: HTMLButtonElement | null = null;
	protected titleElement: HTMLElement | null = null;
	protected descriptionElement: HTMLElement | null = null;
	protected events: EventEmitter;

	constructor(events: EventEmitter) {
		this.events = events;
		this.element = cloneTemplate(TEMPLATES.SUCCESS);
		this.bindElements();
		this.bindEvents();
	}

	/**
	 * Привязать элементы
	 */
	protected bindElements(): void {
		this.closeButton = this.element.querySelector(
			`.${CSS_CLASSES.ORDER_SUCCESS_CLOSE}`
		);
		this.titleElement = this.element.querySelector(
			`.${CSS_CLASSES.ORDER_SUCCESS_TITLE}`
		);
		this.descriptionElement = this.element.querySelector(
			`.${CSS_CLASSES.ORDER_SUCCESS_DESCRIPTION}`
		);
	}

	/**
	 * Привязать события
	 */
	protected bindEvents(): void {
		if (this.closeButton) {
			addListener(this.closeButton, 'click', this.handleClose.bind(this));
		}
	}

	/**
	 * Обработчик закрытия
	 */
	protected handleClose(event: Event): void {
		this.events.emit(EVENTS.MODAL_CLOSE);
	}

	/**
	 * Установить данные заказа
	 */
	setOrderData(total: number, orderId?: string): void {
		this.total = total;
		this.orderId = orderId || null;
		this.renderSuccess();
	}

	/**
	 * Установить сумму заказа
	 */
	setTotal(total: number): void {
		this.total = total;
		this.renderSuccess();
	}

	/**
	 * Рендер компонента
	 */
	protected renderSuccess(): void {
		// Устанавливаем заголовок
		if (this.titleElement) {
			setText(this.titleElement, MESSAGES.ORDER_SUCCESS);
		}

		// Устанавливаем описание с суммой и номером заказа
		if (this.descriptionElement) {
			let description = MESSAGES.ORDER_SUCCESS_DESCRIPTION.replace('{total}', formatPrice(this.total));
			
			if (this.orderId) {
				description += `\nНомер заказа: ${this.orderId}`;
			}
			
			setText(this.descriptionElement, description);
		}
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
		if (this.closeButton) {
			removeListener(this.closeButton, 'click', this.handleClose.bind(this));
		}
	}
}
