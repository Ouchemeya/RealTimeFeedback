from abc import ABC, abstractmethod
from typing import Dict, Any, List
from datetime import datetime

class BaseAgent(ABC):
    """Classe de base pour tous les agents AI"""
    
    def __init__(self, name: str):
        self.name = name
        self.last_analysis = None
        self.analysis_history = []
        print(f"🤖 Agent initialized: {name}")
    
    @abstractmethod
    async def analyze(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Méthode principale d'analyse à implémenter"""
        pass
    
    def _store_analysis(self, result: Dict[str, Any]):
        """Stocke l'analyse dans l'historique"""
        self.last_analysis = {
            "timestamp": datetime.now().isoformat(),
            "result": result
        }
        self.analysis_history.append(self.last_analysis)
        
        # Garde seulement les 50 dernières analyses
        if len(self.analysis_history) > 50:
            self.analysis_history = self.analysis_history[-50:]
    
    def get_last_analysis(self) -> Dict[str, Any]:
        """Retourne la dernière analyse"""
        return self.last_analysis
    
    def get_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Retourne l'historique des analyses"""
        return self.analysis_history[-limit:]