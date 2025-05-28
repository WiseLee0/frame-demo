import { getProjectState } from "../projectState"
import { getTransform } from "./matrix";

export const getAbsoluteElementById = (id: string) => {
    const elements = getProjectState('elements')
    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        if (element.id === id) {
            return element;
        }
        if (element.type === 'frame' && element.elements.length) {
            for (let j = 0; j < element.elements.length; j++) {
                const childElement = element.elements[j];
                if (childElement.id === id) {
                    const parentTransform = getTransform(element)
                    const childTransform = getTransform(childElement)
                    const absoluteTransform = parentTransform.multiply(childTransform)
                    const absoluteElement = absoluteTransform.decompose()
                    return absoluteElement;
                }
            }
        }
    }
}