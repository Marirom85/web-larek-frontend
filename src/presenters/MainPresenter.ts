import { IMainPresenter, IProductModel } from '../types';
import { EventEmitter } from '../components/base/events';
import { Api } from '../components/base/api';
import { ProductModel } from '../models/ProductModel';
import { BasketModel } from '../models/BasketModel';
import { OrderModel } from '../models/OrderModel';
import { ProductApi } from '../api/ProductApi';
import { OrderApi } from '../api/OrderApi';
import { MainView } from '../views/MainView';
import { Modal } from '../components/base/Modal';
import { ProductPreview } from '../components/base/ProductPreview';
import { Basket } from '../components/base/Basket';
import { NewOrderForm } from '../components/base/NewOrderForm';
import { Success } from '../components/base/Success';
import { API_URL, EVENTS, MESSAGES, MODAL_TYPES } from '../utils/constants';

export class MainPresenter implements IMainPresenter {
	private events: EventEmitter;
	private productModel: ProductModel;
	private basketModel: BasketModel;
	private orderModel: OrderModel;
	private productApi: ProductApi;
	private orderApi: OrderApi;
	private view: MainView;
	private modal: Modal;
	private currentModal: string | null = null;
	private orderForm: NewOrderForm;
	private basket: Basket;
	private currentStep: 1 | 2 = 1;

	constructor() {
		console.log('MainPresenter constructor - start');
		this.events = new EventEmitter();
		const api = new Api(API_URL);
		
		// Инициализация API
		this.productApi = new ProductApi(api);
		this.orderApi = new OrderApi(api);

		// Инициализация моделей
		this.productModel = new ProductModel(this.events);
		this.basketModel = new BasketModel(this.events);
		this.orderModel = new OrderModel(this.events);

		// Инициализация представлений и компонентов
		this.view = new MainView(this.events);
		this.modal = new Modal(
			document.getElementById('modal-container') as HTMLElement
		);
		this.orderForm = new NewOrderForm(this.events);
		this.basket = new Basket(this.events);

		console.log('MainPresenter constructor - calling bindEvents');
		this.bindEvents();
		console.log('MainPresenter constructor - end');
	}

	/**
	 * Привязать события
	 */
	private bindEvents(): void {
		console.log('MainPresenter bindEvents - ORDER_UPDATE constant:', EVENTS.ORDER_UPDATE);
		
		// События товаров
		this.events.on(
			EVENTS.PRODUCTS_LOADED,
			this.handleProductsLoaded.bind(this)
		);
		this.events.on(EVENTS.PRODUCT_ADD, this.handleProductAdd.bind(this));
		this.events.on(EVENTS.PRODUCT_REMOVE, this.handleProductRemove.bind(this));

		// События корзины
		this.events.on(EVENTS.BASKET_UPDATE, this.handleBasketUpdate.bind(this));
		this.events.on(EVENTS.BASKET_CLEAR, this.handleBasketClear.bind(this));

		// События заказа
		this.events.on(EVENTS.ORDER_START, this.handleOrderStart.bind(this));

		// События модальных окон
		this.events.on(EVENTS.MODAL_OPEN, this.handleModalOpen.bind(this));
		this.events.on(EVENTS.MODAL_CLOSE, this.handleModalClose.bind(this));

		// События ошибок
		this.events.on(EVENTS.ERROR_SHOW, this.handleErrorShow.bind(this));

		// События обновления заказа
		this.events.on(EVENTS.ORDER_UPDATE, this.handleOrderUpdateStep.bind(this));
		console.log('Subscribed to ORDER_UPDATE event');

		// События превью товара
		this.events.on('productPreview:buttonClick', this.handleProductPreviewButtonClick.bind(this));
	}

	/**
	 * Инициализация
	 */
	init(): void {
		this.loadProducts();
	}

	/**
	 * Загрузить товары
	 */
	async loadProducts(): Promise<void> {
		try {
			this.view.showLoading();
			const response = await this.productApi.getProducts();
			this.productModel.setProducts(response.items);
		} catch (error) {
			console.error('Ошибка загрузки товаров:', error);
			this.view.showError(MESSAGES.PRODUCTS_LOAD_ERROR);
		}
	}

	/**
	 * Открыть модальное окно товара
	 */
	openProductModal(productId: string): void {
		const product = this.productModel.getProduct(productId);
		if (product) {
			const preview = new ProductPreview(this.events);
			preview.setProduct(product);
			preview.setInBasket(product.inBasket);

			this.modal.setContent(preview.render());
			this.modal.open();
			this.currentModal = 'product';
		}
	}

	/**
	 * Открыть модальное окно корзины
	 */
	openBasketModal(): void {
		this.basket.updateBasket(this.basketModel.getItems());
		this.basket.updateTotal(this.basketModel.getTotal());

		this.modal.setContent(this.basket.render());
		this.modal.open();
		this.currentModal = 'basket';
	}

	/**
	 * Добавить товар в корзину
	 */
	addToBasket(productId: string): void {
		const product = this.productModel.getProduct(productId);
		if (product && !product.inBasket) {
			product.inBasket = true;
			this.basketModel.addItem(product);
			this.view.updateBasketCount(this.basketModel.getCount());
			this.updateBasketModalIfOpen();
			this.events.emit(EVENTS.PRODUCT_ADD, { product });
		}
	}

	/**
	 * Удалить товар из корзины
	 */
	removeFromBasket(productId: string): void {
		const product = this.productModel.getProduct(productId);
		if (product && product.inBasket) {
			product.inBasket = false;
			this.basketModel.removeItem(productId);
			this.view.updateBasketCount(this.basketModel.getCount());
			this.updateBasketModalIfOpen();
			this.events.emit(EVENTS.PRODUCT_REMOVE, { productId });
		}
	}

	/**
	 * Начать оформление заказа
	 */
	startOrder(): void {
		// Сбрасываем шаг на первый при каждом новом оформлении заказа
		this.currentStep = 1;
		this.orderForm.setStep(1);
		this.orderModel.reset();
		
		// Отписываемся от предыдущих событий формы (если были)
		this.events.off('order:payment:change', this.handlePaymentChange.bind(this));
		this.events.off('formErrors:change', this.handleFormErrors.bind(this));
		this.events.off('order:submit', this.handleOrderSubmit.bind(this));
		
		this.modal.setContent(this.orderForm.render());
		this.modal.open();
		this.currentModal = 'order';

		// Подписываемся на события формы
		// Обработчик order:update уже подписан через EVENTS.ORDER_UPDATE в bindEvents()
		this.events.on('order:payment:change', this.handlePaymentChange.bind(this));
		this.events.on('formErrors:change', this.handleFormErrors.bind(this));
		this.events.on('order:submit', this.handleOrderSubmit.bind(this));
	}

	/**
	 * Отправить заказ
	 */
	async submitOrder(): Promise<void> {
		try {
			const orderData = this.orderModel.getData();
			const basketItems = this.basketModel.getItems();

			const order = {
				payment: orderData.payment!,
				address: orderData.address,
				email: orderData.email,
				phone: orderData.phone,
				total: this.basketModel.getTotal(),
				items: basketItems.map((item) => item.id),
			};

			await this.orderApi.createOrder(order);

			// Очищаем корзину и сбрасываем счётчик
			this.basketModel.clear();
			// Очищаем флаги корзины у всех товаров
			this.productModel.getProducts().forEach(product => {
				product.inBasket = false;
			});
			this.view.updateBasketCount(0);
			this.orderModel.reset();

			// Показываем успешное сообщение
			const success = new Success(this.events);
			success.setTotal(order.total);

			this.modal.setContent(success.render());
			this.modal.open();
			this.currentModal = 'success';
		} catch (error) {
			this.events.emit(EVENTS.ERROR_SHOW, {
				message: MESSAGES.ORDER_SUBMIT_ERROR,
			});
			console.error('Ошибка отправки заказа:', error);
		}
	}

	// Обработчики событий

	private handleProductsLoaded(data: { products: any[] }): void {
		this.view.renderProducts(data.products);
		this.basketModel.syncWithProducts(data.products);
	}

	private handleProductAdd(data: { product: IProductModel }): void {
		if (data.product) {
			this.addToBasket(data.product.id);
		}
	}

	private handleProductRemove(data: { productId: string }): void {
		if (data.productId) {
			this.removeFromBasket(data.productId);
		}
	}

	private handleBasketUpdate(data: { basket: any }): void {
		this.view.updateBasketCount(data.basket.count);
	}

	private handleBasketClear(data: { basket: any }): void {
		this.view.updateBasketCount(0);
	}

	private handleOrderStart(): void {
		this.startOrder();
	}

	private handleModalOpen(data: { type: string; data: any }): void {
		if (data.type === 'product' || data.type === MODAL_TYPES.PRODUCT) {
			this.openProductModal(data.data.productId);
		} else if (data.type === 'basket' || data.type === MODAL_TYPES.BASKET) {
			this.openBasketModal();
		}
	}

	private handleModalClose(): void {
		this.modal.close();
		this.currentModal = null;
	}

	private handleErrorShow(data: { message: string }): void {
		this.view.showError(data.message);
	}

	/**
	 * Обработчик обновления шага заказа
	 */
	private handleOrderUpdateStep(data: { key: string; value: string }): void {
		console.log('handleOrderUpdateStep called with:', data);
		// Всегда обновляем данные в модели и валидность формы
		if (this.currentModal === 'order') {
			console.log('Order update:', data.key, data.value);
			this.orderModel.setData(data.key, data.value);
			const isValid = this.currentStep === 1 
				? this.orderModel.validateStep1()
				: this.orderModel.validateStep2();
			console.log('Validation result:', isValid);
			this.orderForm.valid = isValid;
		} else {
			console.log('Not in order modal, current modal:', this.currentModal);
		}
	}

	/**
	 * Обработчик обновления данных заказа
	 */
	private handleOrderUpdate(data: { key: string; value: string }): void {
		this.orderModel.setData(data.key, data.value);
	}

	/**
	 * Обработчик изменения способа оплаты
	 */
	private handlePaymentChange(data: { key: string; value: string }): void {
		console.log('Payment change:', data.key, data.value);
		this.orderModel.setData(data.key, data.value);
		// Обновляем валидность формы после изменения способа оплаты
		if (this.currentModal === 'order') {
			const isValid = this.currentStep === 1 
				? this.orderModel.validateStep1()
				: this.orderModel.validateStep2();
			console.log('Payment validation result:', isValid);
			this.orderForm.valid = isValid;
		}
	}

	/**
	 * Обработчик изменения ошибок формы
	 */
	private handleFormErrors(errors: Record<string, string>): void {
		const { payment, address, email, phone } = errors;
		
		// Обновляем представление формы с отображением соответствующих ошибок
		console.log('Form errors:', errors);
		
		// Передаем ошибки в форму для отображения
		if (this.currentModal === 'order') {
			// Фильтруем ошибки по текущему шагу
			let filteredErrors: Record<string, string> = {};
			
			if (this.currentStep === 1) {
				// На первом шаге показываем только ошибки оплаты и адреса
				if (errors.payment) filteredErrors.payment = errors.payment;
				if (errors.address) filteredErrors.address = errors.address;
			} else {
				// На втором шаге показываем только ошибки email и телефона
				if (errors.email) filteredErrors.email = errors.email;
				if (errors.phone) filteredErrors.phone = errors.phone;
			}
			
			// Формируем строку с ошибками для отображения
			const errorMessages = Object.values(filteredErrors).filter(msg => msg).join('\n');
			this.orderForm.errors = errorMessages;
			
			// Обновляем валидность формы при изменении ошибок
			const isValid = this.currentStep === 1 
				? this.orderModel.validateStep1()
				: this.orderModel.validateStep2();
			this.orderForm.valid = isValid;
		}
	}

	/**
	 * Обработчик отправки формы заказа
	 */
	private handleOrderSubmit(data: { step: number }): void {
		// Проверяем валидность текущего шага перед переходом
		if (this.currentModal === 'order') {
			const isValid = this.currentStep === 1 
				? this.orderModel.validateStep1()
				: this.orderModel.validateStep2();
			
			if (isValid) {
				if (this.currentStep === 1) {
					this.setStep(2);
				} else {
					const orderData = this.orderModel.getData();
					this.submitOrder();
				}
			} else {
				// Если форма невалидна, обновляем состояние кнопки
				this.orderForm.valid = false;
			}
		}
	}

	/**
	 * Установить шаг формы заказа
	 */
	private setStep(step: 1 | 2): void {
		this.currentStep = step;
		this.orderForm.setStep(step);
		
		// Обновляем валидность формы для нового шага
		const isValid = step === 1 
			? this.orderModel.validateStep1()
			: this.orderModel.validateStep2();
		this.orderForm.valid = isValid;
	}

	/**
	 * Обработчик клика по кнопке в превью товара
	 */
	private handleProductPreviewButtonClick(data: { productId: string; inBasket: boolean }): void {
		if (data.inBasket) {
			// Удаляем из корзины
			this.removeFromBasket(data.productId);
			// Закрываем модалку после удаления
			this.events.emit(EVENTS.MODAL_CLOSE);
		} else {
			const product = this.productModel.getProduct(data.productId);
			if (product) {
				// Проверяем, есть ли цена у товара
				if (!product.price || product.price <= 0) {
					// Не добавляем товары без цены в корзину
					return;
				}
				// Добавляем в корзину
				this.addToBasket(data.productId);
				// Закрываем модалку после покупки
				this.events.emit(EVENTS.MODAL_CLOSE);
			}
		}
	}

	/**
	 * Обновить модальное окно корзины, если оно открыто
	 */
	private updateBasketModalIfOpen(): void {
		if (this.currentModal === 'basket') {
			this.basket.updateBasket(this.basketModel.getItems());
			this.basket.updateTotal(this.basketModel.getTotal());
			this.modal.setContent(this.basket.render());
		}
	}
}
