"""
Nexus QA - Test Crews
=====================
Test ekipleri tanımları
"""

from .test_crew import TestCrew
from .security_crew import SecurityCrew
from .document_crew import DocumentCrew, document_crew
from .automation_crew import AutomationCrew, automation_crew

__all__ = ['TestCrew', 'SecurityCrew', 'DocumentCrew', 'AutomationCrew', 'document_crew', 'automation_crew']
