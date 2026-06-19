export interface EditFormValues {
  id: string;
  content: string;
  explanation: string;
  question_type: string;
  sequence_order: number;
  answers: {
    content: string;
    is_correct: boolean;
  }[];
}

export interface FormQuestion {
  content: string;
  explanation: string;
  question_type: string;
  answers: {
    content: string;
    is_correct: boolean;
  }[];
}

export interface AddQuestionFormValues {
  questions: FormQuestion[];
}
export type AddQuestionFormType = import('@mantine/form').UseFormReturnType<AddQuestionFormValues>;
export type EditQuestionFormType = import('@mantine/form').UseFormReturnType<EditFormValues>;
