import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

let socketInstance = null;

export function useSocket(onNovaMsg, onMovimentacao, onWhatsappStatus) {
  const handlersRef = useRef({ onNovaMsg, onMovimentacao, onWhatsappStatus });
  handlersRef.current = { onNovaMsg, onMovimentacao, onWhatsappStatus };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!socketInstance) {
      socketInstance = io(window.location.origin, { transports: ['websocket', 'polling'] });
    }

    socketInstance.emit('autenticar', token);

    const onMsg = (data) => handlersRef.current.onNovaMsg?.(data);
    const onMov = (data) => handlersRef.current.onMovimentacao?.(data);
    const onWa  = (data) => handlersRef.current.onWhatsappStatus?.(data);

    socketInstance.on('nova_mensagem_whatsapp', onMsg);
    socketInstance.on('nova_movimentacao', onMov);
    socketInstance.on('whatsapp_status', onWa);

    return () => {
      socketInstance.off('nova_mensagem_whatsapp', onMsg);
      socketInstance.off('nova_movimentacao', onMov);
      socketInstance.off('whatsapp_status', onWa);
    };
  }, []);

  const entrarConversa = useCallback((id) => {
    socketInstance?.emit('entrar_conversa', id);
  }, []);

  const sairConversa = useCallback((id) => {
    socketInstance?.emit('sair_conversa', id);
  }, []);

  return { entrarConversa, sairConversa };
}
