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
import { BasketView } from './views/BasketView';

// Компоненты
import { Modal } from './components/base/Modal';
import { ProductPreview } from './components/base/ProductPreview';
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

// Создание статических компонентов один раз
const basketView = new BasketView(events);
const successView = new Success(events);

// Инициализация презентера
import { MainPresenter } from './presenters/MainPresenter';
const mainPresenter = new MainPresenter(
	events,
	productModel,
	basketModel,
	orderModel,
	productApi,
	orderApi
);

let currentModal: 'product' | 'basket' | 'order' | 'success' | null = null;
let currentOrderForm: OrderForm | null = null;

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
	// Используем статический компонент basketView
	basketView.updateItems(basketModel.getItems());
	basketView.updateTotal(basketModel.getTotal());
	basketView.updateCount(basketModel.getCount());

	modal.setContent(basketView.render());
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
			// Обновляем статический компонент basketView
			basketView.updateItems(basketModel.getItems());
			basketView.updateTotal(basketModel.getTotal());
			basketView.updateCount(basketModel.getCount());
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
		// Обновляем статический компонент basketView
		basketView.updateItems(basketModel.getItems());
		basketView.updateTotal(basketModel.getTotal());
		basketView.updateCount(basketModel.getCount());
	}
}

/**
 * Начать оформление заказа
 */
function startOrder(): void {
	currentOrderForm = new OrderForm(events);
	modal.setContent(currentOrderForm.render());
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

		console.log('Отправка заказа:', orderData);
		console.log('Товары в корзине:', basketItems);

		const order = {
			payment: orderData.payment!,
			address: orderData.address,
			email: orderData.email,
			phone: orderData.phone,
			total: basketModel.getTotal(),
			items: basketItems.map((item) => item.id),
		};

		console.log('Заказ для отправки:', order);

		const response = await orderApi.createOrder(order);
		console.log('Ответ от сервера:', response);

		basketModel.clear();
		productModel.clearBasket();
		mainView.updateBasketCount(0);
		orderModel.reset();

		// Используем статический компонент successView
		successView.setOrderData(order.total, response.id);
		console.log('Success view обновлен');

		modal.setContent(successView.render());
		console.log('Контент модального окна установлен');

		modal.open();
		currentModal = 'success';
		console.log('Модальное окно успешного заказа открыто');
	} catch (error) {
		console.error('Ошибка отправки заказа:', error);
		events.emit(EVENTS.ERROR_SHOW, {
			message: MESSAGES.ORDER_SUBMIT_ERROR,
		});
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
	events.on(EVENTS.BASKET_CHANGE, (data: { basket: any }) => {
		mainView.updateBasketCount(data.basket.count);
	});

	// События заказа
	events.on(EVENTS.ORDER_START, () => {
		startOrder();
	});

	events.on(EVENTS.ORDER_UPDATE, (data: { step: number }) => {
		console.log('ORDER_UPDATE event received:', data);
		console.log('Current modal:', currentModal);
		console.log('Current order form exists:', !!currentOrderForm);
		
		if (currentModal === 'order' && currentOrderForm) {
			console.log('Setting step to:', data.step);
			currentOrderForm.setStep(data.step as 1 | 2);
		} else {
			console.log('Cannot set step - currentModal:', currentModal, 'currentOrderForm:', currentOrderForm);
		}
	});

	events.on(EVENTS.ORDER_SUBMIT, (data: { data: any }) => {
		console.log('ORDER_SUBMIT event received:', data);
		if (data && data.data) {
			orderModel.setPayment(data.data.payment);
			orderModel.setAddress(data.data.address);
			orderModel.setEmail(data.data.email);
			orderModel.setPhone(data.data.phone);
			submitOrder();
		}
	});

	// События модальных окон обрабатываются в MainPresenter
	// events.on(EVENTS.MODAL_OPEN, (data: { type: string; data: any }) => {
	// 	console.log('MODAL_OPEN event received:', data);
	// 	if (data.type === MODAL_TYPES.PRODUCT || data.type === 'product') {
	// 		openProductModal(data.data.productId);
	// 	} else if (data.type === MODAL_TYPES.BASKET || data.type === 'basket') {
	// 		openBasketModal();
	// 	}
	// });

	events.on(EVENTS.MODAL_CLOSE, () => {
		modal.close();
		currentModal = null;
		currentOrderForm = null;
	});

	// События ошибок
	events.on(EVENTS.ERROR_SHOW, (data: { message: string }) => {
		mainView.showError(data.message);
	});
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
	setupEventHandlers();
	mainPresenter.init();
});

// Экспорт для использования в других модулях
export { events, api };
