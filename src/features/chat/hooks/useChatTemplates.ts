import { useCallback, useEffect, useState } from 'react';
import { chatService } from '../services/chatService';
import type { ChatTemplateDefinition, ChatTemplateType } from '../types/chat.types';

/**
 * Loads the guided template catalog once per mount. The catalog is small and
 * static, so a plain fetch is enough — no shared cache needed.
 */
export function useChatTemplates() {
  const [templates, setTemplates] = useState<ChatTemplateDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTemplates(await chatService.getTemplates());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const findTemplate = useCallback(
    (type: ChatTemplateType): ChatTemplateDefinition | undefined =>
      templates.find((t) => t.type === type),
    [templates],
  );

  return { templates, loading, error, refresh: load, findTemplate };
}
