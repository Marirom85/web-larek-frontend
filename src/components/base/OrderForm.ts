
import { IOrderForm, IOrderModel, PaymentMethod } from '../../types';
import { CSS_CLASSES, EVENTS } from '../../utils/constants';
import {
  addListener,
  removeListener,
  setText,
  formatPhone,
} from '../../utils/utils';
import { EventEmitter } from './events';
import { OrderModel } from '../../models/OrderModel';

/**
 * Класс формы заказа, реализующий интерфейс IOrderForm
 * Отвечает за отображение и управление формой оформления заказа
 */
export class OrderForm implements IOrderForm {
  // Основной DOM-элемент формы
  protected element: HTMLElement;
  
  // Текущий шаг формы (1 - способ оплаты и адрес, 2 - email и телефон)
  protected currentStep: 1 | 2 = 1;

  // Модель данных заказа
  protected orderModel: OrderModel;

  // Элементы управления формы
  protected paymentButtons: HTMLButtonElement[] = [];
  protected addressInput: HTMLInputElement | null = null;
  protected emailInput: HTMLInputElement | null = null;
  protected phoneInput: HTMLInputElement | null = null;

  // Кнопка отправки формы и элемент для отображения ошибок
  protected submitButton: HTMLButtonElement | null = null;
  protected errorsElement: HTMLElement | null = null;
  
  // Система событий для коммуникации с другими компонентами
  protected events: EventEmitter;

  // Сохраняем связанные обработчики, чтобы add/removeListener использовали одни и те же функции
  private boundHandlePaymentClick: EventListener;
  private boundHandleAddressInput: EventListener;
  private boundHandleEmailInput: EventListener;
  private boundHandlePhoneInput: EventListener;
  private boundHandleSubmit: EventListener;

  /**
   * Конструктор формы заказа
   * @param events - экземпляр EventEmitter для отправки событий
   */
  constructor(events: EventEmitter) {
    this.events = events;
    
    // Создаем DOM-структуру формы
    this.element = this.createForm();
    
    // Инициализируем модель заказа
    this.orderModel = new OrderModel(events);

    // Привязываем методы один раз для оптимизации производительности
    this.boundHandlePaymentClick = this.handlePaymentClick.bind(this);
    this.boundHandleAddressInput = this.handleAddressInput.bind(this);
    this.boundHandleEmailInput = this.handleEmailInput.bind(this);
    this.boundHandlePhoneInput = this.handlePhoneInput.bind(this);
    this.boundHandleSubmit = this.handleSubmit.bind(this);

    // Настраиваем обработчики событий и отображаем форму
    this.bindEvents();
    this.renderForm();
  }

  /**
   * Создает DOM-структуру формы заказа
   * @returns HTMLElement - созданная форма
   */
  protected createForm(): HTMLElement {
    // Получаем шаблоны из HTML
    const orderTemplate = document.getElementById('order') as HTMLTemplateElement;
    const contactsTemplate = document.getElementById('contacts') as HTMLTemplateElement;

    if (!orderTemplate || !contactsTemplate) {
      throw new Error('Order form templates not found in HTML');
    }

    // Клонируем содержимое шаблона заказа (первый шаг)
    const orderForm = orderTemplate.content.cloneNode(true) as DocumentFragment;
    const form = orderForm.querySelector('form') as HTMLFormElement;
    
    // Клонируем содержимое шаблона контактов (второй шаг)
    const contactsForm = contactsTemplate.content.cloneNode(true) as DocumentFragment;
    const contactsStep = contactsForm.querySelector('.order') as HTMLElement;
    
    // Находим элементы первого шага и скрываем второй шаг изначально
    const orderStep = form.querySelector('.order') as HTMLElement;
    contactsStep.style.display = 'none';
    
    // Добавляем второй шаг в форму
    form.appendChild(contactsStep);
    
    return form;
  }

  /**
   * Настраивает обработчики событий для элементов формы
   * Этап 2: Привязка событий к элементам управления
   */
  protected bindEvents(): void {
    // Находим все элементы управления формы
    this.paymentButtons = Array.from(
      this.element.querySelectorAll<HTMLButtonElement>('button[name]')
    );
    this.addressInput = this.element.querySelector<HTMLInputElement>('input[name="address"]');
    this.emailInput = this.element.querySelector<HTMLInputElement>('input[name="email"]');
    this.phoneInput = this.element.querySelector<HTMLInputElement>('input[name="phone"]');
    this.submitButton = this.element.querySelector<HTMLButtonElement>('button[type="submit"]');
    this.errorsElement = this.element.querySelector<HTMLElement>('.form__errors');

    // Обработчики для кнопок выбора способа оплаты
    this.paymentButtons.forEach((button) =>
      addListener(button, 'click', this.boundHandlePaymentClick)
    );

    // Обработчики ввода данных для полей формы
    if (this.addressInput) {
      addListener(this.addressInput, 'input', this.boundHandleAddressInput);
    }
    if (this.emailInput) {
      addListener(this.emailInput, 'input', this.boundHandleEmailInput);
    }
    if (this.phoneInput) {
      addListener(this.phoneInput, 'input', this.boundHandlePhoneInput);
    }

    // Обработчик отправки формы
    addListener(this.element, 'submit', this.boundHandleSubmit);
  }

  /**
   * Обработчик выбора способа оплаты
   * Этап 3: Обработка пользовательских действий
   */
  protected handlePaymentClick(event: Event): void {
    const button = event.target as HTMLButtonElement;
    const payment = button.name as PaymentMethod;

    // Снимаем выделение со всех кнопок и выделяем выбранную
    this.paymentButtons.forEach((btn) => btn.classList.remove(CSS_CLASSES.BUTTON_ALT));
    button.classList.add(CSS_CLASSES.BUTTON_ALT);

    // Сохраняем выбор в модели и валидируем форму
    this.orderModel.setPayment(payment);
    this.validate();
  }

  /**
   * Обработчик ввода адреса доставки
   */
  protected handleAddressInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.orderModel.setAddress(input.value);
    this.validate();
  }

  /**
   * Обработчик ввода email
   */
  protected handleEmailInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.orderModel.setEmail(input.value);
    this.validate();
  }

  /**
   * Обработчик ввода телефона с автоматическим форматированием
   */
  protected handlePhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatted = formatPhone(input.value);
    input.value = formatted;
    this.orderModel.setPhone(formatted);
    this.validate();
  }

  /**
   * Обработчик отправки формы
   * Этап 4: Управление процессом оформления заказа
   */
  protected handleSubmit(event: Event): void {
    event.preventDefault();

    if (this.currentStep === 1 && this.orderModel.validateStep1()) {
      // Переход ко второму шагу если данные первого шага валидны
      this.setStep(2);
    } else if (this.currentStep === 2 && this.orderModel.validateStep2()) {
      // Отправка заказа если все данные валидны
      this.events.emit(EVENTS.ORDER_SUBMIT, { data: this.orderModel.getData() });
    } else {
      // Показать ошибки если данные невалидны
      this.showErrors();
    }
  }

  /**
   * Устанавливает текущий шаг формы
   * @param step - номер шага (1 или 2)
   */
  setStep(step: 1 | 2): void {
    this.currentStep = step;

    // Находим шаги формы
    const steps = this.element.querySelectorAll('.order');
    const step1 = steps[0] as HTMLElement;
    const step2 = steps[1] as HTMLElement;

    if (step === 1) {
      // Показываем первый шаг, скрываем второй
      step1.style.display = 'block';
      step2.style.display = 'none';
      if (this.submitButton) this.submitButton.textContent = 'Далее';
    } else {
      // Показываем второй шаг, скрываем первый
      step1.style.display = 'none';
      step2.style.display = 'block';
      if (this.submitButton) this.submitButton.textContent = 'Оплатить';
    }

    // Перевалидируем форму после смены шага
    this.validate();
  }

  /**
   * Валидирует текущий шаг формы
   * @returns boolean - результат валидации
   */
  validate(): boolean {
    let isValid = this.currentStep === 1 
      ? this.orderModel.validateStep1() 
      : this.orderModel.validateStep2();

    // Блокируем/разблокируем кнопку отправки в зависимости от валидности
    if (this.submitButton) this.submitButton.disabled = !isValid;

    // Показываем/скрываем ошибки
    this.showErrors();

    return isValid;
  }

  /**
   * Отображает ошибки валидации
   * Этап 5: Обработка и отображение ошибок
   */
  protected showErrors(): void {
    if (!this.errorsElement) return;

    const errorsObj = this.orderModel.getValidationErrors();

    const visibleErrors: string[] = [];
    if (this.currentStep === 1) {
      // Ошибки для первого шага: способ оплаты и адрес
      if (errorsObj.payment) visibleErrors.push(errorsObj.payment);
      if (errorsObj.address) visibleErrors.push(errorsObj.address);
    } else {
      // Ошибки для второго шага: email и телефон
      if (errorsObj.email) visibleErrors.push(errorsObj.email);
      if (errorsObj.phone) visibleErrors.push(errorsObj.phone);
    }

    if (visibleErrors.length > 0) {
      // Показываем блок с ошибками
      this.errorsElement.style.display = 'block';
      this.errorsElement.style.color = 'red';
      this.errorsElement.style.fontSize = '14px';
      this.errorsElement.style.marginTop = '10px';
      this.errorsElement.style.padding = '10px';
      this.errorsElement.style.backgroundColor = '#ffe6e6';
      this.errorsElement.style.border = '1px solid #ff9999';
      this.errorsElement.style.borderRadius = '5px';
      setText(this.errorsElement, visibleErrors.join(', '));
    } else {
      // Скрываем блок с ошибками
      this.errorsElement.style.display = 'none';
      this.errorsElement.textContent = '';
    }
  }

  /**
   * Обновляет отображение формы на основе данных модели
   * Этап 6: Синхронизация данных модели и представления
   */
  protected renderForm(): void {
    const data = this.orderModel.getData();

    // Заполняем поля формы данными из модели
    if (this.addressInput) this.addressInput.value = data.address;
    if (this.emailInput) this.emailInput.value = data.email;
    if (this.phoneInput) this.phoneInput.value = data.phone;

    // Выделяем выбранный способ оплаты
    this.paymentButtons.forEach((button) => {
      if (button.name === data.payment) {
        button.classList.add(CSS_CLASSES.BUTTON_ALT);
      } else {
        button.classList.remove(CSS_CLASSES.BUTTON_ALT);
      }
    });

    // Перевалидируем форму после обновления данных
    this.validate();
  }

  /**
   * Возвращает данные заказа из модели
   * @returns IOrderModel - данные заказа
   */
  getData(): IOrderModel {
    return this.orderModel.getData();
  }

  /**
   * Устанавливает данные в модель заказа
   * @param data - частичные данные заказа для обновления
   */
  setData(data: Partial<IOrderModel>): void {
    if (data.payment !== undefined) this.orderModel.setPayment(data.payment);
    if (data.address !== undefined) this.orderModel.setAddress(data.address);
    if (data.email !== undefined) this.orderModel.setEmail(data.email);
    if (data.phone !== undefined) this.orderModel.setPhone(data.phone);
    this.renderForm();
  }

  /**
   * Возвращает DOM-элемент формы для рендеринга
   * @returns HTMLElement - элемент формы
   */
  render(): HTMLElement {
    return this.element;
  }

  /**
   * Очищает все обработчики событий и освобождает ресурсы
   * Этап 7: Завершение работы компонента
   */
  destroy(): void {
    // Удаляем обработчики с кнопок оплаты
    this.paymentButtons.forEach((button) =>
      removeListener(button, 'click', this.boundHandlePaymentClick)
    );

    // Удаляем обработчики ввода с полей формы
    if (this.addressInput) {
      removeListener(this.addressInput, 'input', this.boundHandleAddressInput);
    }
    if (this.emailInput) {
      removeListener(this.emailInput, 'input', this.boundHandleEmailInput);
    }
    if (this.phoneInput) {
      removeListener(this.phoneInput, 'input', this.boundHandlePhoneInput);
    }

    // Удаляем обработчик отправки формы
    removeListener(this.element, 'submit', this.boundHandleSubmit);
  }
}
