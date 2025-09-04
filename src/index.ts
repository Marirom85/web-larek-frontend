import './scss/styles.scss';

// Инициализация презентера
import { MainPresenter } from './presenters/MainPresenter';

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
	const mainPresenter = new MainPresenter();
	mainPresenter.init();
});
