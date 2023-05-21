import { QuestionType } from "../types/enums"

export function reorder<T>(array: Array<T>, from: number, to: number): Array<T> {
    const newArray = [...array]
    const item = newArray.splice(from, 1)[0]
    newArray.splice(to, 0, item)
    return newArray
}

export function createBlankQuestion(type: QuestionType, language: string): Question {
    return {
        // TODO: only set id when saving to db?
        id: "",
        title: {
            [language]: ""
        },
        description: {
            [language]: ""
        },
        required: false,
        type
    }
}