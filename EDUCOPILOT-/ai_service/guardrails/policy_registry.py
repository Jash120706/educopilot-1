"""
Central Policy Registry mapping Roles to Authorized Agents, RAGs, and Tools.
"""

ROLE_POLICIES = {
    "STUDENT": {
        "allowed_agents": [
            "StudyPlannerAgent",
            "PracticeTestAgent",
            "DoubtSolverAgent",
            "ProgressAgent",
            "PublicSupportAgent"
        ],
        "allowed_rags": [
            "syllabus_rag",
            "course_content_rag",
            "question_bank_rag",
            "student_records_rag",
            "academic_policy_rag"
        ],
        "denied_rags": [
            "answer_key_rubric_rag"  # STRICTLY DENIED FOR STUDENTS
        ],
        "allowed_tools": [
            "create_study_plan",
            "summarize_topic",
            "generate_practice_test",
            "evaluate_own_practice_answer",
            "explain_answer",
            "answer_doubt",
            "worked_example",
            "analyze_own_performance",
            "identify_weak_topics"
        ],
        "denied_tools": [
            "grade_subjective",
            "grade_mcq",
            "generate_notes",
            "schedule_lecture",
            "generate_mixed_test"
        ]
    },
    "PROFESSOR": {
        "allowed_agents": [
            "MaterialPreparationAgent",
            "SchedulingAgent",
            "CreateTestAgent",
            "GradingAgent",
            "PublicSupportAgent"
        ],
        "allowed_rags": [
            "syllabus_rag",
            "course_content_rag",
            "question_bank_rag",
            "answer_key_rubric_rag",
            "student_records_rag",
            "academic_policy_rag"
        ],
        "denied_rags": [],
        "allowed_tools": [
            "generate_notes",
            "generate_slides_outline",
            "create_assignment",
            "generate_examples",
            "suggest_topic_sequence",
            "schedule_lecture",
            "generate_mcq",
            "generate_true_false",
            "generate_objective",
            "generate_subjective",
            "generate_mixed_test",
            "grade_mcq",
            "grade_true_false",
            "grade_objective",
            "grade_numerical",
            "grade_subjective",
            "aggregate_score",
            "generate_feedback"
        ],
        "denied_tools": []
    },
    "PUBLIC": {
        "allowed_agents": ["PublicSupportAgent"],
        "allowed_rags": ["syllabus_rag", "academic_policy_rag"],
        "denied_rags": ["course_content_rag", "question_bank_rag", "answer_key_rubric_rag", "student_records_rag"],
        "allowed_tools": ["answer_doubt"],
        "denied_tools": []
    }
}
