<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Components → hooks/pages → `src/services/*` → `src/services/api.ts` → FastAPI. Why: backend can replace mocks without touching UI.
- No `fetch` outside `src/services/api.ts`; base URL comes only from `VITE_API_BASE_URL` (empty = mock mode). Why: single configurable HTTP boundary.
- Shared backend-facing types live in `src/types/index.ts` (re-exports of `src/lib` domain types). Why: one vocabulary across UI and services.
- Per-stage state persists in localStorage stores in `src/lib/*`; services read them as the mock backend. Why: one source of truth per stage.
