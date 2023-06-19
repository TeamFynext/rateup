import { createContext } from 'react';

interface QuestionCountContextType {
  questionCount: number;
  currentQuestionNo: number;
  setQuestionCount: (count: number) => void;
  setCurrentQuestionNo: (questionNo: number) => void;
}

const QuestionCountContext = createContext<QuestionCountContextType>({
  questionCount: 0,
  currentQuestionNo: 0,
  setQuestionCount: () => {},
  setCurrentQuestionNo: () => {},
});

export default QuestionCountContext;
