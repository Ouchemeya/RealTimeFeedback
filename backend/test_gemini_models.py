import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.gemini_service import gemini_service

async def test_all():
    print("🧪 Testing Robust Gemini Service\n")
    
    if not gemini_service:
        print("❌ Gemini service not initialized")
        return
    
    # Test 1: Pacing (règles simples, pas d'API)
    print("=" * 60)
    print("Test 1: Analyze Pacing (Rule-based)")
    print("=" * 60)
    result = await gemini_service.analyze_pacing(
        reaction_counts={'speed_up': 2, 'slow_down': 8, 'show_code': 3, 'im_lost': 1},
        recent_reactions=[],
        duration_seconds=60
    )
    print(f"Status: {result['pacing_status']}")
    print(f"Alert: {result['alert_level']}")
    print(f"Recommendation: {result['recommendation']}")
    print(f"Score: {result['engagement_score']}\n")
    
    # Test 2: Generate Insights (règles, pas d'API)
    print("=" * 60)
    print("Test 2: Generate Insights (Rule-based)")
    print("=" * 60)
    result = await gemini_service.generate_insights(
        reaction_counts={'speed_up': 3, 'slow_down': 2, 'show_code': 12, 'im_lost': 4},
        questions=["Q1", "Q2", "Q3"],
        duration_minutes=5
    )
    print(f"Overall Health: {result['overall_health']}")
    print(f"Key Recommendation: {result['key_recommendation']}")
    print("Insights:")
    for insight in result['insights']:
        print(f"  - [{insight['priority']}] {insight['message']}")
    print()
    
    # Test 3: Simple text generation
    print("=" * 60)
    print("Test 3: Simple Text Generation")
    print("=" * 60)
    try:
        response = await gemini_service.generate_text(
            "Say 'Test successful' in 3 words",
            temperature=0.5,
            max_tokens=50
        )
        print(f"Response: {response}\n")
    except Exception as e:
        print(f"Error: {e}\n")
    
    print("✅ All tests completed!")

if __name__ == "__main__":
    asyncio.run(test_all())