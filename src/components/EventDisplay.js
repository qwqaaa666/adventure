// src/components/EventDisplay.js

/**
 * 清空选项按钮。
 * @param {HTMLElement} choicesAreaElement 选项按钮的父元素。
 */
export function clearChoices(choicesAreaElement) {
    choicesAreaElement.innerHTML = '';
}

/**
 * 渲染事件文本和选项。
 * @param {HTMLElement} eventTextPElement 事件文本元素。
 * @param {HTMLElement} choicesAreaElement 选项区域元素。
 * @param {string} text 事件文本。
 * @param {Array} choices 选项数组。
 * @param {Function} handleChoiceCallback 选项点击时的回调函数。
 */
export function renderEvent(eventTextPElement, choicesAreaElement, text, choices, handleChoiceCallback) {
    eventTextPElement.textContent = text;
    clearChoices(choicesAreaElement);
    if (choices) {
        choices.forEach(choice => {
            const button = document.createElement('button');
            button.textContent = choice.text;
            button.addEventListener('click', () => handleChoiceCallback(choice));
            choicesAreaElement.appendChild(button);
        });
    }
}