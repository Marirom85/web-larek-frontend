import { BaseOrderForm } from './BaseOrderForm';

/**
 * Класс представления первого шага формы заказа (способ оплаты и адрес)
 */
export class OrderStepView extends BaseOrderForm {
    protected createForm(): HTMLElement {
        const template = document.getElementById('order') as HTMLTemplateElement;
        if (!template) {
            throw new Error('Order template not found in HTML');
        }

        const form = template.content.cloneNode(true) as DocumentFragment;
        return form.querySelector('form') as HTMLElement;
    }
}
