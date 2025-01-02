import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const AddKeyDialog = ({
  parentPath = '',
  onAdd,
  trigger,
}: {
  parentPath?: string;
  onAdd: (key: string, value: string | object) => void;
  trigger: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const [formState, setFormState] = useState({
    type: 'value' as 'value' | 'object',
    key: '',
    value: '',
  });

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Only reset the form after the dialog has finished closing
      requestAnimationFrame(() => {
        setFormState({
          type: 'value',
          key: '',
          value: '',
        });
      });
    }
    setOpen(newOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullKey = parentPath
      ? `${parentPath}.${formState.key}`
      : formState.key;

    if (formState.type === 'value') {
      onAdd(fullKey, formState.value);
    } else {
      onAdd(fullKey, {});
    }

    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className='sm:max-w-md'>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              Add New {parentPath ? 'Nested Key' : 'Root Key'}
            </DialogTitle>
          </DialogHeader>

          <div className='grid gap-6 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='key'>Key Name</Label>
              <Input
                id='key'
                value={formState.key}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, key: e.target.value }))
                }
                placeholder='Enter key name'
                className='w-full'
                required
              />
            </div>

            <div className='grid gap-2'>
              <Label>Key Type</Label>
              <RadioGroup
                value={formState.type}
                onValueChange={(value) =>
                  setFormState((prev) => ({
                    ...prev,
                    type: value as 'value' | 'object',
                  }))
                }
                className='grid gap-2'
              >
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='value' id='value' />
                  <Label htmlFor='value'>Key-Value Pair</Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='object' id='object' />
                  <Label htmlFor='object'>Nested Object</Label>
                </div>
              </RadioGroup>
            </div>

            {formState.type === 'value' && (
              <div className='grid gap-2'>
                <Label htmlFor='value'>Value</Label>
                <Input
                  id='value'
                  value={formState.value}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      key: prev.key,
                      value: e.target.value,
                    }))
                  }
                  placeholder='Enter value'
                  className='w-full'
                  required={formState.type === 'value'}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type='submit'>Add Key</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddKeyDialog;
