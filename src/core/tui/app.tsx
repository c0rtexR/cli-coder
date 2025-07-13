import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { ChatPanel } from './components/ChatPanel';
import { FilePanel } from './components/FilePanel';
import { InputPanel } from './components/InputPanel';
import { StatusBar } from './components/StatusBar';
import type { TUIAppProps } from '../../types/tui.types';
import { llmService } from '../../integrations/llm';

export const TUIApp: React.FC<TUIAppProps> = ({ session, config }) => {
  const { exit } = useApp();
  const [activePanel, setActivePanel] = useState<'chat' | 'files' | 'input'>('input');
  const [chatPanelWidth, setChatPanelWidth] = useState(60);
  const [showHelp, setShowHelp] = useState(false);

  // Global keyboard shortcuts
  useInput((input: string, key: any) => {
    if (key.ctrl && input === 'c') {
      exit();
      return;
    }

    if (key.tab) {
      // Cycle through panels
      const panels: Array<'chat' | 'files' | 'input'> = ['chat', 'files', 'input'];
      const currentIndex = panels.indexOf(activePanel);
      const nextIndex = (currentIndex + 1) % panels.length;
      setActivePanel(panels[nextIndex]);
      return;
    }

    if (key.ctrl && input === 'h') {
      setShowHelp(!showHelp);
      return;
    }

    // Panel resizing
    if (key.ctrl && key.leftArrow && chatPanelWidth > 40) {
      setChatPanelWidth(chatPanelWidth - 5);
      return;
    }

    if (key.ctrl && key.rightArrow && chatPanelWidth < 80) {
      setChatPanelWidth(chatPanelWidth + 5);
      return;
    }
  });

  if (showHelp) {
    return <HelpScreen onClose={() => setShowHelp(false)} />;
  }

  const providerName = llmService.getProviderName?.() || 'unknown';
  const modelName = llmService.getModelName?.() || 'unknown';

  return (
    <Box flexDirection="column" height="100%">
      <StatusBar 
        provider={providerName}
        model={modelName}
        fileCount={session.context.length}
        activePanel={activePanel}
      />

      <Box flexGrow={1} flexDirection="row">
        <Box width={`${chatPanelWidth}%`} borderStyle="single">
          <ChatPanel 
            session={session}
            isActive={activePanel === 'chat'}
            onActivate={() => setActivePanel('chat')}
          />
        </Box>

        <Box flexGrow={1} borderStyle="single">
          <FilePanel 
            session={session}
            isActive={activePanel === 'files'}
            onActivate={() => setActivePanel('files')}
          />
        </Box>
      </Box>

      <Box height={5} borderStyle="single">
        <InputPanel 
          session={session}
          isActive={activePanel === 'input'}
          onActivate={() => setActivePanel('input')}
        />
      </Box>
    </Box>
  );
};

const HelpScreen: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  useInput((input: string, key: any) => {
    if (key.escape || input === 'q' || (key.ctrl && input === 'h')) {
      onClose();
    }
  });

  return (
    <Box flexDirection="column" padding={2}>
      <Text bold color="blue">🚀 CLI Coder - Keyboard Shortcuts</Text>
      <Text> </Text>
      <Text><Text bold>Global Shortcuts:</Text></Text>
      <Text>  Tab           - Switch between panels</Text>
      <Text>  Ctrl+C        - Exit application</Text>
      <Text>  Ctrl+H        - Show/hide this help</Text>
      <Text>  Ctrl+←/→      - Resize chat panel</Text>
      <Text> </Text>
      <Text><Text bold>Chat Panel:</Text></Text>
      <Text>  ↑/↓           - Scroll through messages</Text>
      <Text>  Page Up/Down  - Fast scroll</Text>
      <Text> </Text>
      <Text><Text bold>File Panel:</Text></Text>
      <Text>  ↑/↓           - Navigate files</Text>
      <Text>  Enter         - Add/remove from context</Text>
      <Text>  Space         - Preview file</Text>
      <Text> </Text>
      <Text><Text bold>Input Panel:</Text></Text>
      <Text>  Ctrl+Enter    - Send message</Text>
      <Text>  ↑/↓           - Command history</Text>
      <Text> </Text>
      <Text color="gray">Press Esc, q, or Ctrl+H to close this help</Text>
    </Box>
  );
};