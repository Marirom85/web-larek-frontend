import { EventEmitter } from './events';
import { OrderStepView } from './OrderStepView';
import { ContactsStepView } from './ContactsStepView';

/**
 * Класс формы заказа, который управляет двумя шагами
 */
export class NewOrderForm {
    protected element: HTMLElement;
    protected events: EventEmitter;
    protected currentStep: 1 | 2 = 1;
    protected orderStep: OrderStepView;
    protected contactsStep: ContactsStepView;
    protected submitButton: HTMLButtonElement | null = null;
    protected currentValues: Record<string, string> = {};

    constructor(events: EventEmitter) {
        this.events = events;
        this.element = this.createContainer();
        this.orderStep = new OrderStepView(events);
        this.contactsStep = new ContactsStepView(events);
        
        this.renderForm();
        this.bindFormEvents();
    }

    /**
     * Создает контейнер для формы
     */
    protected createContainer(): HTMLElement {
        const container = document.createElement('div');
        return container;
    }

	/**
	 * Рендерит текущий шаг формы
	 */
	protected renderForm(): void {
		this.element.innerHTML = '';
		console.log('NewOrderForm renderForm - step:', this.currentStep);

		if (this.currentStep === 1) {
			this.element.appendChild(this.orderStep.render());
			// Вызываем bindEvents после добавления формы в DOM
			console.log('Calling orderStep.bindEvents()');
			this.orderStep.bindEvents();
		} else {
			this.element.appendChild(this.contactsStep.render());
			// Вызываем bindEvents после добавления формы в DOM
			console.log('Calling contactsStep.bindEvents()');
			this.contactsStep.bindEvents();
		}

		// Восстанавливаем значения полей и состояние кнопок после перерисовки
		if (Object.keys(this.currentValues).length > 0) {
			console.log('Restoring form values after render:', this.currentValues);
			this.setValues(this.currentValues);
		}

		// Находим кнопку отправки
		this.submitButton = this.element.querySelector('button[type="submit"]');
		if (this.submitButton) {
			this.submitButton.textContent = this.currentStep === 1 ? 'Далее' : 'Оплатить';
		}

		// Логируем состояние кнопок оплаты после рендеринга
		if (this.currentStep === 1) {
			const paymentButtons = this.element.querySelectorAll<HTMLButtonElement>('button[name]');
			console.log('Payment buttons after render:', paymentButtons.length);
			paymentButtons.forEach(button => {
				console.log(`Button ${button.name} classes:`, button.className);
			});
		}
	}

    /**
     * Навешивает обработчики событий для управления шагами
     */
    protected bindFormEvents(): void {
        // Обработчик отправки формы
        const form = this.element.querySelector('form');
        if (form) {
            // Удаляем старые обработчики перед добавлением новых
            form.removeEventListener('submit', this.handleFormSubmit.bind(this));
            form.addEventListener('submit', this.handleFormSubmit.bind(this));
        }

        // Обработчик нажатия Enter в полях ввода
        const inputs = this.element.querySelectorAll('input');
        inputs.forEach(input => {
            // Удаляем старые обработчики перед добавлением новых
            input.removeEventListener('keydown', this.handleInputKeydown.bind(this));
            input.addEventListener('keydown', this.handleInputKeydown.bind(this));
        });
    }

    /**
     * Обработчик отправки формы
     */
    private handleFormSubmit(event: Event): void {
        event.preventDefault();
        this.handleSubmit();
    }

    /**
     * Обработчик нажатия клавиш в полях ввода
     */
    private handleInputKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            event.preventDefault(); // Предотвращаем отправку формы по Enter
        }
    }

    /**
     * Обработчик отправки формы
     */
    protected handleSubmit(): void {
        // Эмитируем событие для валидации текущего шага
        // Основная логика обработки теперь в MainPresenter
        this.events.emit('order:submit', { step: this.currentStep });
    }

    /**
     * Устанавливает текущий шаг формы
     */
    setStep(step: 1 | 2): void {
        this.currentStep = step;
        this.renderForm();
        this.bindFormEvents(); // Перепривязываем события после рендеринга
    }

    /**
     * Устанавливает валидность формы для текущего шага
     */
    set valid(value: boolean) {
        if (this.currentStep === 1) {
            this.orderStep.valid = value;
        } else {
            this.contactsStep.valid = value;
        }
    }

    /**
     * Устанавливает ошибки для текущего шага
     */
    set errors(value: string) {
        if (this.currentStep === 1) {
            this.orderStep.errors = value;
        } else {
            this.contactsStep.errors = value;
        }
    }

    /**
     * Заполняет значения формы
     */
    setValues(values: Record<string, string>): void {
        // Сохраняем текущие значения
        this.currentValues = { ...this.currentValues, ...values };
        
        this.orderStep.setValues(this.currentValues);
        this.contactsStep.setValues(this.currentValues);
    }

    /**
     * Возвращает DOM-элемент формы
     */
    render(): HTMLElement {
        return this.element;
    }

    /**
     * Очищает ресурсы
     */
    destroy(): void {
        this.orderStep.destroy();
        this.contactsStep.destroy();
    }
}
