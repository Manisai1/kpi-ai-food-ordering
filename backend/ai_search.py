import os
import requests
import json
import math
from typing import List, Dict, Optional
import models
from dotenv import load_dotenv

PROMPT_FILE = "prompt_config.json"
DEFAULT_PROMPT = (
    "You are an AI assistant for a restaurant. The user will provide a food order in natural language. "
    "Based on the following menu items, identify the best matches and build a cart.\n"
    "Menu Items:\n{menu_context}\n\n"
    "Return ONLY a valid JSON object with an 'items' array containing objects with 'item_id' and 'quantity', and an optional 'message'. "
    "Example: {\"items\": [{\"item_id\": 1, \"quantity\": 2}], \"message\": \"Added paneer tikka\"}. "
    "Do not include any other text, markdown blocks, or explanation."
)

DEFAULT_FILTER_PROMPT = (
    "You are an AI filtering assistant for a restaurant menu. "
    "The user will provide a search query with logic constraints (e.g. 'under 200', 'strictly vegetarian'). "
    "Find the items from the menu that perfectly match their request. "
    "Return ONLY a JSON array of the matching item IDs. Example: [1, 5, 8]. "
    "If none match, return []. "
    "Do not include any other text, markdown formatting, or explanation."
)

def get_system_prompt() -> str:
    if os.path.exists(PROMPT_FILE):
        with open(PROMPT_FILE, "r") as f:
            return json.load(f).get("system_prompt", DEFAULT_PROMPT)
    return DEFAULT_PROMPT

def get_filter_prompt() -> str:
    if os.path.exists(PROMPT_FILE):
        with open(PROMPT_FILE, "r") as f:
            return json.load(f).get("filter_prompt", DEFAULT_FILTER_PROMPT)
    return DEFAULT_FILTER_PROMPT

def update_system_prompt(new_cart_prompt: str, new_filter_prompt: str):
    config = {}
    if os.path.exists(PROMPT_FILE):
        try:
            with open(PROMPT_FILE, "r") as f:
                config = json.load(f)
        except:
            pass
            
    config["system_prompt"] = new_cart_prompt
    config["filter_prompt"] = new_filter_prompt
    
    with open(PROMPT_FILE, "w") as f:
        json.dump(config, f)

def get_openrouter_key():
    load_dotenv()
    return os.getenv("OPENROUTER_API_KEY")

def generate_embedding(text: str) -> List[float]:
    """Generates a semantic vector embedding using OpenRouter nvidia model."""
    api_key = get_openrouter_key()
    if not api_key:
        print("Warning: OPENROUTER_API_KEY not set.")
        return []

    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/embeddings",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            data=json.dumps({
                "model": os.getenv("OPENROUTER_EMBEDDING_MODEL", "nvidia/nemotron-3-embed-1b:free"),
                "input": text,
                "encoding_format": "float"
            }),
            timeout=15
        )
        response.raise_for_status()
        data = response.json()
        return data['data'][0]['embedding']
    except Exception as e:
        print(f"Error calling OpenRouter Embeddings: {e}")
        return []

def compute_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Computes cosine similarity between two vectors."""
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0
    
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    norm_a = math.sqrt(sum(a * a for a in vec1))
    norm_b = math.sqrt(sum(b * b for b in vec2))
    
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    
    return dot_product / (norm_a * norm_b)

def search_menu(query: str, items: List[models.MenuItem]) -> List[Dict]:
    """Search menu using semantic embeddings."""
    query_embedding = generate_embedding(query)
    if not query_embedding:
        return []

    results = []
    for item in items:
        if not item.is_available:
            continue
        
        if item.embedding:
            try:
                item_embedding = json.loads(item.embedding)
                similarity = compute_similarity(query_embedding, item_embedding)
                
                # Format to dictionary
                item_dict = {c.name: getattr(item, c.name) for c in item.__table__.columns}
                item_dict["match_score"] = round(float(similarity), 4)
                results.append(item_dict)
            except Exception as e:
                continue

    results.sort(key=lambda x: x["match_score"], reverse=True)
    return results[:5] # Top 5 semantic matches

def build_ai_cart(query: str, items: List[models.MenuItem]) -> Dict:
    """Uses OpenRouter Chat to build a cart from natural language."""
    api_key = get_openrouter_key()
    if not api_key:
        return {"items": [], "message": "API Key not configured."}

    menu_context = "\n".join([
        f"ID: {item.id} | Name: {item.name} | Category: {item.category} | Price: {item.price} | Desc: {item.description}"
        for item in items if item.is_available
    ])

    system_prompt = get_system_prompt().replace("{menu_context}", menu_context)

    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            data=json.dumps({
                "model": os.getenv("OPENROUTER_LLM_MODEL", "google/gemini-3.7-flash"),
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query}
                ]
            }),
            timeout=15
        )
        response.raise_for_status()
        content = response.json()['choices'][0]['message']['content'].strip()
        
        # Robust JSON extraction for object
        start_idx = content.find('{')
        end_idx = content.rfind('}')
        if start_idx != -1 and end_idx != -1:
            content = content[start_idx:end_idx+1]
            
        return json.loads(content)
    except Exception as e:
        print(f"Error calling LLM Cart: {e}")
        return {"items": [], "message": "Failed to parse cart."}

def search_menu_llm(query: str, items: List[models.MenuItem]) -> List[Dict]:
    """Uses OpenRouter Chat to filter the menu based on logical constraints like price or dietary tags."""
    api_key = get_openrouter_key()
    if not api_key:
        print("Warning: OPENROUTER_API_KEY not set.")
        return []

    menu_context = "\n".join([
        f"ID: {item.id} | Name: {item.name} | Category: {item.category} | Price: {item.price} | Desc: {item.description} | Tag: {item.dietary_tag}"
        for item in items if item.is_available
    ])

    system_prompt = get_filter_prompt()

    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            data=json.dumps({
                "model": os.getenv("OPENROUTER_LLM_MODEL", "google/gemini-3.7-flash"),
                "messages": [
                    {"role": "system", "content": f"{system_prompt}\n\nMenu:\n{menu_context}"},
                    {"role": "user", "content": query}
                ]
            }),
            timeout=15
        )
        response.raise_for_status()
        content = response.json()['choices'][0]['message']['content'].strip()
        
        # Robust JSON extraction for array
        start_idx = content.find('[')
        end_idx = content.rfind(']')
        if start_idx != -1 and end_idx != -1:
            content = content[start_idx:end_idx+1]
            
        matching_ids = json.loads(content)
        
        if not isinstance(matching_ids, list):
            return []
            
        results = []
        for item in items:
            if item.id in matching_ids and item.is_available:
                item_dict = {c.name: getattr(item, c.name) for c in item.__table__.columns}
                item_dict["match_score"] = 1.0 # 100% logic match
                results.append(item_dict)
                
        return results
    except Exception as e:
        print(f"Error calling LLM Filter: {e}")
        return []
