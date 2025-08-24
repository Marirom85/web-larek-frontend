import './scss/styles.scss';
import { EventEmitter } from './components/base/events';
import { Api } from './components/base/api';
import { API_URL, EVENTS, MESSAGES, MODAL_TYPES } from './utils/constants';

// Модели
import { ProductModel } from './models/ProductModel';
import { BasketModel } from './models/BasketModel';
import { OrderModel } from './models/OrderModel';

// API
import { ProductApi } from './api/ProductApi';
import { OrderApi } from './api/OrderApi';

// Представления
import { MainView } from './views/MainView';

// Компоненты
import { Modal } from './components/base/Modal';
import { ProductPreview } from './components/base/ProductPreview';
import { Basket } from './components/base/Basket';
import { OrderForm } from './components/base/OrderForm';
import { Success } from './components/base/Success';

// Инициализация базовых компонентов
const events = new EventEmitter();
const api = new Api(API_URL);

// Инициализация API
const productApi = new ProductApi(api);
const orderApi = new OrderApi(api);

// Инициализация моделей
const productModel = new ProductModel(events);
const basketModel = new BasketModel(events);
const orderModel = new OrderModel(events);

// Инициализация представлений
const mainView = new MainView(events);
const modal = new Modal(
	document.getElementById('modal-container') as HTMLElement
);

let currentModal: 'product' | 'basket' | 'order' | 'success' | null = null;

/**
 * Загрузить товары
 */
async function loadProducts(): Promise<void> {
	try {
		mainView.showLoading();
		const response = await productApi.getProducts();
		productModel.setProducts(response.items);
	} catch (error) {
		console.error('Ошибка загрузки товаров:', error);
		mainView.showError(MESSAGES.PRODUCTS_LOAD_ERROR);
	}
}

/**
 * Открыть модальное окно товара
 */
function openProductModal(productId: string): void {
	const product = productModel.getProduct(productId);
	if (product) {
		const preview = new ProductPreview(events);
		preview.setProduct(product);
		preview.setInBasket(product.inBasket);

		modal.setContent(preview.render());
		modal.open();
		currentModal = 'product';
	}
}

/**
 * Открыть модальное окно корзины
 */
function openBasketModal(): void {
	const basket = new Basket(events);
	basket.updateBasket(basketModel.getItems());

	modal.setContent(basket.render());
	modal.open();
	currentModal = 'basket';
}

/**
 * Добавить товар в корзину
 */
function addToBasket(productId: string): void {
	productModel.addToBasket(productId);
	const product = productModel.getProduct(productId);
	if (product) {
		basketModel.addItem(product);
		mainView.updateBasketCount(basketModel.getCount());

		if (currentModal === 'basket') {
			const basket = new Basket(events);
			basket.updateBasket(basketModel.getItems());
			modal.setContent(basket.render());
		}
	}
}

/**
 * Удалить товар из корзины
 */
function removeFromBasket(productId: string): void {
	productModel.removeFromBasket(productId);
	basketModel.removeItem(productId);
	mainView.updateBasketCount(basketModel.getCount());

	if (currentModal === 'basket') {
		const basket = new Basket(events);
		basket.updateBasket(basketModel.getItems());
		modal.setContent(basket.render());
	}
}

/**
 * Начать оформление заказа
 */
function startOrder(): void {
	const orderForm = new OrderForm(events);
	modal.setContent(orderForm.render());
	modal.open();
	currentModal = 'order';
}

/**
 * Отправить заказ
 */
async function submitOrder(): Promise<void> {
	try {
		const orderData = orderModel.getData();
		const basketItems = basketModel.getItems();

		const order = {
			payment: orderData.payment!,
			address: orderData.address,
			email: orderData.email,
			phone: orderData.phone,
			total: basketModel.getTotal(),
			items: basketItems.map((item) => item.id),
		};

		const response = await orderApi.createOrder(order);

		basketModel.clear();
		productModel.clearBasket();
		mainView.updateBasketCount(0);
		orderModel.reset();

		const success = new Success(events);
		success.setTotal(order.total);

		modal.setContent(success.render());
		modal.open();
		currentModal = 'success';
	} catch (error) {
		events.emit(EVENTS.ERROR_SHOW, {
			message: MESSAGES.ORDER_SUBMIT_ERROR,
		});
		console.error('Ошибка отправки заказа:', error);
	}
}

/**
 * Настроить обработчики событий
 */
function setupEventHandlers(): void {
	// События товаров
	events.on(EVENTS.PRODUCTS_LOADED, (data: { products: any[] }) => {
		mainView.renderProducts(data.products);
		basketModel.syncWithProducts(data.products);
	});

	events.on(EVENTS.PRODUCT_ADD, (data: { product: any }) => {
		if (data.product) {
			addToBasket(data.product.id);
		}
	});

	events.on(EVENTS.PRODUCT_REMOVE, (data: { productId: string }) => {
		if (data.productId) {
			removeFromBasket(data.productId);
		}
	});

	// События корзины
	events.on(EVENTS.BASKET_UPDATE, (data: { basket: any }) => {
		mainView.updateBasketCount(data.basket.count);
	});

	events.on(EVENTS.BASKET_CLEAR, (data: { basket: any }) => {
		mainView.updateBasketCount(0);
	});

	// События заказа
	events.on(EVENTS.ORDER_START, () => {
		startOrder();
	});

	events.on(EVENTS.ORDER_SUBMIT, (data: { data: any }) => {
		if (data.data) {
			orderModel.setPayment(data.data.payment);
			orderModel.setAddress(data.data.address);
			orderModel.setEmail(data.data.email);
			orderModel.setPhone(data.data.phone);
			submitOrder();
		}
	});

	// События модальных окон
	events.on(EVENTS.MODAL_OPEN, (data: { type: string; data: any }) => {
		if (data.type === MODAL_TYPES.PRODUCT) {
			openProductModal(data.data.productId);
		}
	});

	events.on(EVENTS.MODAL_CLOSE, () => {
		modal.close();
		currentModal = null;
	});

	// События ошибок
	events.on(EVENTS.ERROR_SHOW, (data: { message: string }) => {
		mainView.showError(data.message);
	});
}

/**
 * Настроить обработчики DOM событий
 */
function setupDOMEventListeners(): void {
	// Обработчик клика по корзине в шапке
	const basketButton = document.querySelector('.header__basket');
	if (basketButton) {
		basketButton.addEventListener('click', () => {
			openBasketModal();
		});
	}
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
	setupEventHandlers();
	setupDOMEventListeners();
	loadProducts();
});

// Экспорт для использования в других модулях
export { events, api };
