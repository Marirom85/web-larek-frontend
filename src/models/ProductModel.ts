import { IProductModel, IProduct, IProductModelManager } from '../types';
import { EventEmitter } from '../components/base/events';
import { EVENTS } from '../utils/constants';

export class ProductModel implements IProductModelManager {
	private products: IProductModel[] = [];
	private events: EventEmitter;

	constructor(events: EventEmitter) {
		this.events = events;
	}

	/**
	 * Получить все товары
	 */
	getProducts(): IProductModel[] {
		return this.products;
	}

	/**
	 * Получить товар по ID
	 */
	getProduct(id: string): IProductModel | null {
		return this.products.find((product) => product.id === id) || null;
	}

	/**
	 * Установить товары из API
	 */
	setProducts(products: IProduct[]): void {
		this.products = products.map((product) => ({
			...product,
			inBasket: false,
		}));
		this.events.emit(EVENTS.PRODUCTS_LOADED, { products: this.products });
	}

}
