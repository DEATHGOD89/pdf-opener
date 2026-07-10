import React from 'react';
import { Modal, TextInput, Button, Group } from '@mantine/core';

interface TextModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
  initialText?: string;
}

export const TextModal: React.FC<TextModalProps> = ({ opened, onClose, onSubmit, initialText = '' }) => {
  const [text, setText] = React.useState(initialText);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(text);
    setText('');
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Add Text Annotation">
      <form onSubmit={handleSubmit}>
        <TextInput 
          label="Text" 
          placeholder="Enter annotation text" 
          value={text} 
          onChange={(e) => setText(e.currentTarget.value)}
          autoFocus
          data-autofocus
        />
        <Group mt="md">
          <Button type="submit">Add Text</Button>
          <Button variant="default" onClick={onClose}>Cancel</Button>
        </Group>
      </form>
    </Modal>
  );
};
