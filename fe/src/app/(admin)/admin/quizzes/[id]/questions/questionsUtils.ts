export const handleDownloadSample = () => {
  const csvContent = 
    "Question,Type,Explanation,Correct Answers (Pipe Separated),Incorrect Answers (Pipe Separated)\n" +
    "What is the capital of France?,SINGLE,Paris is the capital and most populous city of France.,Paris,London|Berlin|Madrid\n" +
    "Which of the following are primary colors?,MULTIPLE,,Red|Blue|Yellow,Green|Orange|Purple\n" +
    "Is the Earth flat?,SINGLE,The Earth is an oblate spheroid.,False,True";
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'sample_questions.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const getAIPrompt = () => {
  return `Please generate a CSV file for a quiz with the following exactly 5 columns:
1. Question: The text of the question.
2. Type: Must be exactly "SINGLE" or "MULTIPLE".
3. Explanation: (Optional) Explanation shown after answering.
4. Correct Answers: Pipe-separated list (e.g. Option A|Option B).
5. Incorrect Answers: Pipe-separated list (e.g. Option C|Option D).

Do not include any markdown formatting around the CSV output, just raw CSV. 
Example:
Question,Type,Explanation,Correct Answers (Pipe Separated),Incorrect Answers (Pipe Separated)
What is the capital of France?,SINGLE,Paris is the capital and most populous city of France.,Paris,London|Berlin|Madrid
Which of the following are primary colors?,MULTIPLE,,Red|Blue|Yellow,Green|Orange|Purple
Is the Earth flat?,SINGLE,The Earth is an oblate spheroid.,False,True

Please generate 10 questions based on the following topic: [INSERT YOUR TOPIC HERE]`;
};
