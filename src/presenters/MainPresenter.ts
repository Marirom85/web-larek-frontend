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

	constructor() {
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

		this.bindEvents();
	}

	/**
	 * Привязать события
	 */
	private bindEvents(): void {
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
		this.events.on(EVENTS.ORDER_SUBMIT, this.handleOrderSubmitOld.bind(this));

		// События модальных окон
		this.events.on(EVENTS.MODAL_OPEN, this.handleModalOpen.bind(this));
		this.events.on(EVENTS.MODAL_CLOSE, this.handleModalClose.bind(this));

		// События ошибок
		this.events.on(EVENTS.ERROR_SHOW, this.handleErrorShow.bind(this));

		// События обновления заказа
		this.events.on(EVENTS.ORDER_UPDATE, this.handleOrderUpdateStep.bind(this));

		// События закрытия модального окна
		this.events.on(EVENTS.MODAL_CLOSE, this.handleModalClose.bind(this));

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
		this.modal.setContent(this.orderForm.render());
		this.modal.open();
		this.currentModal = 'order';

		// Подписываемся на события формы
		this.events.on('order:update', this.handleOrderUpdate.bind(this));
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

	private handleOrderSubmitOld(data: { data: any }): void {
		if (data.data) {
			this.orderModel.setPayment(data.data.payment);
			this.orderModel.setAddress(data.data.address);
			this.orderModel.setEmail(data.data.email);
			this.orderModel.setPhone(data.data.phone);
			this.submitOrder();
		}
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
	private handleOrderUpdateStep(data: { step: number }): void {
		if (this.currentModal === 'order') {
			this.orderForm.setStep(data.step as 1 | 2);
		}
	}

	/**
	 * Обработчик обновления данных заказа
	 */
	private handleOrderUpdate(data: { key: string; value: string }): void {
		this.orderModel.setData(data.key, data.value);
	}

	/**
	 * Обработчик изменения ошибок формы
	 */
	private handleFormErrors(errors: Record<string, string>): void {
		const { payment, address, email, phone } = errors;
		
		// Здесь должна быть логика обновления представления формы
		// с отображением соответствующих ошибок
		console.log('Form errors:', errors);
	}

	/**
	 * Обработчик отправки формы заказа
	 */
	private handleOrderSubmit(): void {
		const orderData = this.orderModel.getData();
		this.submitOrder();
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
