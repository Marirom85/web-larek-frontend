// Хорошая практика даже простые типы выносить в алиасы
// Зато когда захотите поменять это достаточно сделать в одном месте
type EventName = string | RegExp;
type Subscriber<T = unknown> = (data: T) => void;
type EmitterEvent = {
	eventName: string;
	data: unknown;
};

export interface IEvents {
	on<T extends object>(event: EventName, callback: (data: T) => void): void;
	emit<T extends object>(event: string, data?: T): void;
	trigger<T extends object>(
		event: string,
		context?: Partial<T>
	): (data: T) => void;
}

/**
 * Брокер событий, классическая реализация
 * В расширенных вариантах есть возможность подписаться на все события
 * или слушать события по шаблону например
 */
export class EventEmitter implements IEvents {
	_events: Map<EventName, Set<Subscriber>>;

	constructor() {
		console.log('EventEmitter constructor called');
		this._events = new Map<EventName, Set<Subscriber>>();
	}

	/**
	 * Установить обработчик на событие
	 */
	on<T extends object>(eventName: EventName, callback: (event: T) => void) {
		console.log('EventEmitter.on:', eventName, 'callback:', callback.toString().slice(0, 100) + '...');
		if (!this._events.has(eventName)) {
			this._events.set(eventName, new Set<Subscriber>());
		}
		this._events.get(eventName)?.add(callback);
		console.log('EventEmitter.on - subscribers count:', this._events.get(eventName)?.size);
	}

	/**
	 * Снять обработчик с события
	 */
	off<T extends object>(eventName: EventName, callback: Subscriber<T>) {
		if (this._events.has(eventName)) {
			this._events.get(eventName)!.delete(callback);
			if (this._events.get(eventName)?.size === 0) {
				this._events.delete(eventName);
			}
		}
	}

	/**
	 * Инициировать событие с данными
	 */
	emit<T extends object>(eventName: string, data?: T) {
		console.log('EventEmitter.emit:', eventName, data);
		let handlerCount = 0;
		
		this._events.forEach((subscribers, name) => {
			if (name === '*') {
				subscribers.forEach((callback) => {
					handlerCount++;
					callback({
						eventName,
						data,
					});
				});
			}
			if (
				(name instanceof RegExp && name.test(eventName)) ||
				name === eventName
			) {
				subscribers.forEach((callback) => {
					handlerCount++;
					callback(data);
				});
			}
		});
		
		console.log('EventEmitter.emit - handlers called:', handlerCount);
	}

	/**
	 * Слушать все события
	 */
	onAll(callback: (event: EmitterEvent) => void) {
		this.on('*', callback);
	}

	/**
	 * Сбросить все обработчики
	 */
	offAll() {
		this._events = new Map<string, Set<Subscriber>>();
	}

	/**
	 * Сделать коллбек триггер, генерирующий событие при вызове
	 */
	trigger<T extends object>(eventName: string, context?: Partial<T>) {
		return (event: object = {}) => {
			this.emit(eventName, {
				...(event || {}),
				...(context || {}),
			});
		};
	}
}
