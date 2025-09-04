import { EventEmitter } from './events';
import { addListener, removeListener, formatPhone } from '../../utils/utils';
import { EVENTS } from '../../utils/constants';

/**
 * Базовый класс формы заказа, который навешивает слушатели событий
 * на поля ввода и кнопки выбора способа оплаты
 */
export abstract class BaseOrderForm {
    protected element: HTMLElement;
    protected events: EventEmitter;
    protected selectedPayment: string | null = null;

	constructor(events: EventEmitter) {
		this.events = events;
		this.element = this.createForm();
		// bindEvents будет вызван после добавления формы в DOM
	}

    /**
     * Создает DOM-структуру формы (должен быть реализован в дочерних классах)
     */
    protected abstract createForm(): HTMLElement;

	/**
	 * Находит и навешивает слушатели событий на все элементы формы
	 */
	public bindEvents(): void {
		// Находим все поля ввода
		const inputs = this.element.querySelectorAll<HTMLInputElement>('input[name]');
		
		// Находим все кнопки выбора способа оплаты
		const paymentButtons = this.element.querySelectorAll<HTMLButtonElement>('button[name]');

		console.log('BaseOrderForm bindEvents - inputs found:', inputs.length);
		console.log('BaseOrderForm bindEvents - payment buttons found:', paymentButtons.length);

		// Вешаем обработчики input на поля ввода
		inputs.forEach(input => {
			console.log('Adding input handler for:', input.name);
			addListener(input, 'input', () => {
				let value = input.value;
				console.log('Input event:', input.name, value);
				
				// Автоматическое форматирование телефона
				if (input.name === 'phone') {
					// Сохраняем текущее состояние фокуса и позицию курсора
					const isFocused = document.activeElement === input;
					const cursorPosition = input.selectionStart;
					
					value = formatPhone(value);
					input.value = value;
					
					// Восстанавливаем фокус и позицию курсора
					if (isFocused) {
						input.focus();
						// Пытаемся восстановить позицию курсора с учетом форматирования
						const newCursorPosition = Math.min(cursorPosition || 0, value.length);
						input.setSelectionRange(newCursorPosition, newCursorPosition);
					}
				}
				
				this.events.emit(EVENTS.ORDER_UPDATE, { 
					key: input.name, 
					value: value 
				});
				console.log('Emitted order:update for:', input.name, value);
			});
		});

		// Вешаем обработчики click на кнопки выбора способа оплаты
		paymentButtons.forEach(button => {
			console.log('Adding payment button handler for:', button.name);
			addListener(button, 'click', (event) => {
				// Предотвращаем отправку формы при клике на кнопку оплаты
				event.preventDefault();
				console.log('Payment button clicked:', button.name);
				
				// Для кнопок оплаты используем отдельное событие
				this.events.emit('order:payment:change', { 
					key: 'payment', 
					value: button.name 
				});
				console.log('Emitted order:payment:change for:', button.name);
				
				// Также эмитим обычное событие обновления для consistency
				this.events.emit(EVENTS.ORDER_UPDATE, {
					key: 'payment',
					value: button.name
				});
				console.log('Emitted order:update for payment:', button.name);
				
				// Сохраняем выбранный способ оплаты и выделяем кнопку
				console.log('Payment selected:', button.name);
				this.selectedPayment = button.name;
				paymentButtons.forEach(btn => {
					console.log('Removing button_payment_selected from:', btn.name);
					btn.classList.remove('button_payment_selected');
				});
				console.log('Adding button_payment_selected to:', button.name);
				button.classList.add('button_payment_selected');
				console.log('Current selectedPayment:', this.selectedPayment);
			});
		});

		// Обработчик отправки формы удален, так как управление формой
		// теперь осуществляется через NewOrderForm

		// Восстанавливаем состояние кнопок оплаты после bindEvents
		this.restorePaymentSelection();
	}

	/**
	 * Восстанавливает выделение выбранной кнопки оплаты
	 */
	protected restorePaymentSelection(): void {
		console.log('restorePaymentSelection called, selectedPayment:', this.selectedPayment);
		if (this.selectedPayment) {
			const paymentButtons = this.element.querySelectorAll<HTMLButtonElement>('button[name]');
			console.log('Found payment buttons:', paymentButtons.length);
			paymentButtons.forEach(button => {
				console.log('Processing button:', button.name);
				if (button.name === this.selectedPayment) {
					console.log('Adding button_payment_selected to:', button.name);
					button.classList.add('button_payment_selected');
				} else {
					console.log('Removing button_payment_selected from:', button.name);
					button.classList.remove('button_payment_selected');
				}
			});
		} else {
			console.log('No selected payment to restore');
		}
	}

    /**
     * Устанавливает валидность формы (для кнопки отправки)
     */
    set valid(value: boolean) {
        const submitButton = this.element.querySelector<HTMLButtonElement>('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = !value;
        }
    }

    /**
     * Устанавливает сообщения об ошибках
     */
    set errors(value: string) {
        const errorsElement = this.element.querySelector<HTMLElement>('.form__errors');
        if (errorsElement) {
            errorsElement.textContent = value;
            errorsElement.style.display = value ? 'block' : 'none';
        }
    }

    /**
     * Заполняет поля формы значениями
     */
    setValues(values: Record<string, string>): void {
        console.log('BaseOrderForm setValues called with:', values);
        
        Object.entries(values).forEach(([key, value]) => {
            const input = this.element.querySelector<HTMLInputElement>(`[name="${key}"]`);
            const button = this.element.querySelector<HTMLButtonElement>(`[name="${key}"]`);
            
            if (input && value !== undefined) {
                console.log(`Setting input ${key} to:`, value);
                input.value = value;
            }
            
            if (button && value !== undefined) {
                console.log(`Processing button ${key} with value:`, value);
                // Для кнопок способа оплаты добавляем/убираем класс выделения
                if (button.name === value) {
                    console.log(`Adding button_payment_selected to ${button.name}`);
                    button.classList.add('button_payment_selected');
                    // Сохраняем выбранный способ оплаты
                    if (key === 'payment') {
                        this.selectedPayment = value;
                        console.log('Saved selectedPayment:', this.selectedPayment);
                    }
                } else {
                    console.log(`Removing button_payment_selected from ${button.name}`);
                    button.classList.remove('button_payment_selected');
                }
            }
        });

        // Восстанавливаем состояние кнопок оплаты
        console.log('Calling restorePaymentSelection from setValues');
        this.restorePaymentSelection();
    }

    /**
     * Возвращает DOM-элемент формы
     */
    render(): HTMLElement {
        return this.element;
    }

    /**
     * Очищает обработчики событий
     */
    destroy(): void {
        // В данной реализации обработчики очищаются автоматически при удалении DOM-элементов
    }
}
