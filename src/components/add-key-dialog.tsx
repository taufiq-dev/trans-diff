import { useState } from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { overlayStore } from '@/stores/overlay-store';
import { useSelector } from '@xstate/store/react';

const AddKeyDialog = () => {
  const onAdd = useSelector(overlayStore, (state) => state.context.onAdd);
  const parentPath = useSelector(
    overlayStore,
    (state) => state.context.parentPath,
  );
  const closeAddKeyDialog = () =>
    overlayStore.send({ type: 'closeAddKeyDialog' });

  const [formState, setFormState] = useState({
    type: 'value' as 'value' | 'object',
    key: '',
    value: '',
  });

  // const handleOpenChange = () => {
  //   requestAnimationFrame(() => {
  //     setFormState({
  //       type: 'value',
  //       key: '',
  //       value: '',
  //     });
  //   });
  // };

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

    closeAddKeyDialog();
  };

  return (
    <Card className='w-[28rem] h-fit m-auto'>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className='text-lg'>
            Add New {parentPath ? 'Nested Key' : 'Root Key'}
          </CardTitle>
        </CardHeader>
        <CardContent className='sm:max-w-md'>
          <div className='grid gap-6'>
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
        </CardContent>
        <CardFooter className='flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2'>
          <Button type='button' variant='outline' onClick={closeAddKeyDialog}>
            Cancel
          </Button>
          <Button type='submit'>Add Key</Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default AddKeyDialog;
