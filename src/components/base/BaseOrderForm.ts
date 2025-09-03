import { EventEmitter } from './events';
import { addListener, removeListener } from '../../utils/utils';

/**
 * Базовый класс формы заказа, который навешивает слушатели событий
 * на поля ввода и кнопки выбора способа оплаты
 */
export abstract class BaseOrderForm {
    protected element: HTMLElement;
    protected events: EventEmitter;

    constructor(events: EventEmitter) {
        this.events = events;
        this.element = this.createForm();
        this.bindEvents();
    }

    /**
     * Создает DOM-структуру формы (должен быть реализован в дочерних классах)
     */
    protected abstract createForm(): HTMLElement;

    /**
     * Находит и навешивает слушатели событий на все элементы формы
     */
    protected bindEvents(): void {
        // Находим все поля ввода
        const inputs = this.element.querySelectorAll<HTMLInputElement>('input[name]');
        
        // Находим все кнопки выбора способа оплаты
        const paymentButtons = this.element.querySelectorAll<HTMLButtonElement>('button[name]');

        // Вешаем обработчики input на поля ввода
        inputs.forEach(input => {
            addListener(input, 'input', () => {
                this.events.emit('order:update', { 
                    key: input.name, 
                    value: input.value 
                });
            });
        });

        // Вешаем обработчики click на кнопки выбора способа оплаты
        paymentButtons.forEach(button => {
            addListener(button, 'click', () => {
                this.events.emit('order:update', { 
                    key: button.name, 
                    value: button.name 
                });
            });
        });

        // Обработчик отправки формы
        const form = this.element.querySelector('form');
        if (form) {
            addListener(form, 'submit', (event) => {
                event.preventDefault();
                this.events.emit('order:submit');
            });
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
        Object.entries(values).forEach(([key, value]) => {
            const input = this.element.querySelector<HTMLInputElement>(`[name="${key}"]`);
            const button = this.element.querySelector<HTMLButtonElement>(`[name="${key}"]`);
            
            if (input && value !== undefined) {
                input.value = value;
            }
            
            if (button && value !== undefined) {
                // Для кнопок способа оплаты добавляем/убираем класс выделения
                if (button.name === value) {
                    button.classList.add('button_alt');
                } else {
                    button.classList.remove('button_alt');
                }
            }
        });
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
