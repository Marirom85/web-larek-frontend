import { BaseOrderForm } from './BaseOrderForm';

/**
 * Класс представления второго шага формы заказа (email и телефон)
 */
export class ContactsStepView extends BaseOrderForm {
    protected createForm(): HTMLElement {
        const template = document.getElementById('contacts') as HTMLTemplateElement;
        if (!template) {
            throw new Error('Contacts template not found in HTML');
        }

        const form = template.content.cloneNode(true) as DocumentFragment;
        return form.querySelector('form') as HTMLElement;
    }
}
