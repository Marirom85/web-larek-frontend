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
 * Настроить обработчики событий
 */
function setupEventHandlers(): void {
	// События заказа (обрабатываются здесь, так как используют локальные переменные)
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
