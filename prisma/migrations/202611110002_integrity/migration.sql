ALTER TABLE "Question" ADD CONSTRAINT "Question_number_valid" CHECK ("number" BETWEEN 1 AND 50);
ALTER TABLE "AssessmentQuestionOrder" ADD CONSTRAINT "AssessmentQuestionOrder_position_valid" CHECK ("position" BETWEEN 1 AND 50);
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_cursor_valid" CHECK ("cursor" BETWEEN 1 AND 50);
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_single_attempt" CHECK ("attemptLimit" = 1);
ALTER TABLE "AssessmentResult" ADD CONSTRAINT "AssessmentResult_totals_valid"
  CHECK ("answered" = 50 AND "interested" >= 0 AND "uninterested" >= 0 AND "interested" + "uninterested" = "answered");
