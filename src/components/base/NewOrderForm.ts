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

        if (this.currentStep === 1) {
            this.element.appendChild(this.orderStep.render());
        } else {
            this.element.appendChild(this.contactsStep.render());
        }

        // Находим кнопку отправки
        this.submitButton = this.element.querySelector('button[type="submit"]');
        if (this.submitButton) {
            this.submitButton.textContent = this.currentStep === 1 ? 'Далее' : 'Оплатить';
        }
    }

    /**
     * Навешивает обработчики событий для управления шагами
     */
    protected bindFormEvents(): void {
        // Обработчик отправки формы
        const form = this.element.querySelector('form');
        if (form) {
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                this.handleSubmit();
            });
        }
    }

    /**
     * Обработчик отправки формы
     */
    protected handleSubmit(): void {
        if (this.currentStep === 1) {
            this.setStep(2);
        } else {
            this.events.emit('order:submit');
        }
    }

    /**
     * Устанавливает текущий шаг формы
     */
    setStep(step: 1 | 2): void {
        this.currentStep = step;
        this.renderForm();
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
        this.orderStep.setValues(values);
        this.contactsStep.setValues(values);
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
