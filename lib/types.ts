export interface Question {
  key: string;
  step: string;
  title: string;
  subtitle: string;
  options: string[];
}

export interface UserState {
  step: string;
  answers: Record<string, string>;
}

export interface UserAnswers {
  name?: string;
  university?: string;
  bunri?: string;
  grade?: string;
  gender?: string;
  graduation?: string;
}

