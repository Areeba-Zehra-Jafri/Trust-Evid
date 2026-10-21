import json
from types import SimpleNamespace


def test_raw_ai_response_is_jsonb_compatible(monkeypatch):
    import db
    calls = []
    class Query:
        def select(self, *args): return self
        def eq(self, *args): return self
        def order(self, *args, **kwargs): return self
        def limit(self, *args): return self
        def update(self, payload): calls.append(payload); return self
        def insert(self, payload): calls.append(payload); return self
        def execute(self): return SimpleNamespace(data=[])
    client = SimpleNamespace(table=lambda _: Query())
    db.persist_ai(client, {"id":"e1", "case_id":"c1", "owner_user_id":"u1"},
                  {"review_priority":"low"}, None, '{"summary":"ok"}')
    assert calls[-1]["raw_response"] == {"summary": "ok"}
    assert isinstance(calls[-1]["raw_response"], (dict, list))


def test_non_json_provider_text_is_bounded_object():
    import db
    calls = []
    class Query:
        def select(self, *args): return self
        def eq(self, *args): return self
        def order(self, *args, **kwargs): return self
        def limit(self, *args): return self
        def update(self, payload): calls.append(payload); return self
        def insert(self, payload): calls.append(payload); return self
        def execute(self): return SimpleNamespace(data=[])
    client = SimpleNamespace(table=lambda _: Query())
    db.persist_ai(client, {"id":"e1", "case_id":"c1", "owner_user_id":"u1"},
                  None, "invalid", "not-json")
    assert calls[-1]["raw_response"] == {"text": "not-json"}
    assert len(json.dumps(calls[-1]["raw_response"])) < 250_100
