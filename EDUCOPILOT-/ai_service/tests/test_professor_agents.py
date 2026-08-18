import pytest
from agents.professor.material_preparation import MaterialPreparationAgent
from agents.professor.create_test import CreateTestAgent
from agents.professor.scheduling import SchedulingAgent
from agents.professor.grading import GradingAgent

def test_material_preparation_agent():
    agent = MaterialPreparationAgent()
    payload = {
        "topic": "Raft Consensus Protocol",
        "subject": "Distributed Systems",
        "type": "practice_questions",
        "questionCount": 3,
        "pointsPerQuestion": 10
    }
    result = agent.execute(payload)
    assert isinstance(result, dict)
    assert "practiceQuestions" in result or "slides" in result or "lectureNotes" in result

def test_create_test_agent():
    agent = CreateTestAgent()
    payload = {
        "subject": "Distributed Systems",
        "topic": "Leader Election",
        "questionType": "Mixed",
        "questionCount": 5,
        "difficulty": "Medium"
    }
    result = agent.execute(payload)
    assert isinstance(result, dict)
    assert "questions" in result
    assert len(result["questions"]) > 0

def test_scheduling_agent():
    agent = SchedulingAgent()
    payload = {
        "subject": "Distributed Systems",
        "numPeriods": 6
    }
    result = agent.execute(payload)
    assert isinstance(result, dict)
    assert "plan" in result

def test_grading_agent():
    agent = GradingAgent()
    payload = {
        "questions": [
            {
                "questionType": "MCQ",
                "question": "What is Raft?",
                "options": ["Consensus Protocol", "Database", "Language", "OS"],
                "correctAnswerIndex": 0,
                "points": 2
            }
        ],
        "studentAnswers": {
            "0": 0
        }
    }
    result = agent.execute(payload)
    assert isinstance(result, dict)
