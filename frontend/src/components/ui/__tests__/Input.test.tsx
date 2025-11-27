import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../Input';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    label: React.forwardRef<HTMLLabelElement, React.ComponentPropsWithoutRef<'label'>>(
      ({ children, ...props }, ref) => (
        <label ref={ref} {...props}>
          {children}
        </label>
      )
    ),
    input: React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<'input'>>(
      ({ children, ...props }, ref) => (
        <input ref={ref} {...props}>
          {children}
        </input>
      )
    ),
    textarea: React.forwardRef<HTMLTextAreaElement, React.ComponentPropsWithoutRef<'textarea'>>(
      ({ children, ...props }, ref) => (
        <textarea ref={ref} {...props}>
          {children}
        </textarea>
      )
    ),
    div: React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>(
      ({ children, ...props }, ref) => (
        <div ref={ref} {...props}>
          {children}
        </div>
      )
    ),
    p: React.forwardRef<HTMLParagraphElement, React.ComponentPropsWithoutRef<'p'>>(
      ({ children, ...props }, ref) => (
        <p ref={ref} {...props}>
          {children}
        </p>
      )
    ),
  },
}));

describe('Input', () => {
  it('should render basic input', () => {
    render(<Input placeholder="Enter text" />);
    
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('block', 'rounded-md', 'shadow-sm');
  });

  it('should render with label', () => {
    render(<Input label="Username" placeholder="Enter username" />);
    
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('should apply correct variant classes', () => {
    const { rerender } = render(<Input variant="default" />);
    expect(screen.getByRole('textbox')).toHaveClass('border-gray-300');

    rerender(<Input variant="success" />);
    expect(screen.getByRole('textbox')).toHaveClass('border-green-300');

    rerender(<Input error="Some error" />);
    expect(screen.getByRole('textbox')).toHaveClass('border-red-300');
  });

  it('should apply correct size classes', () => {
    const { rerender } = render(<Input size="sm" />);
    expect(screen.getByRole('textbox')).toHaveClass('px-3', 'py-1.5', 'text-sm');

    rerender(<Input size="md" />);
    expect(screen.getByRole('textbox')).toHaveClass('px-3', 'py-2', 'text-sm');

    rerender(<Input size="lg" />);
    expect(screen.getByRole('textbox')).toHaveClass('px-4', 'py-3', 'text-base');
  });

  it('should handle value changes', () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test value' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('test value');
  });

  it('should display error message', () => {
    render(<Input error="This field is required" />);
    
    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveClass('border-red-300');
  });

  it('should display helper text', () => {
    render(<Input helperText="Enter your full name" />);
    
    expect(screen.getByText('Enter your full name')).toBeInTheDocument();
  });

  it('should prioritize error over helper text', () => {
    render(
      <Input 
        error="This field is required" 
        helperText="Enter your full name" 
      />
    );
    
    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(screen.queryByText('Enter your full name')).not.toBeInTheDocument();
  });

  it('should render left icon', () => {
    const leftIcon = <span data-testid="left-icon">@</span>;
    render(<Input leftIcon={leftIcon} />);
    
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveClass('pl-10');
  });

  it('should render right icon', () => {
    const rightIcon = <span data-testid="right-icon">👁</span>;
    render(<Input rightIcon={rightIcon} />);
    
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveClass('pr-10');
  });

  it('should render both left and right icons', () => {
    const leftIcon = <span data-testid="left-icon">@</span>;
    const rightIcon = <span data-testid="right-icon">👁</span>;
    render(<Input leftIcon={leftIcon} rightIcon={rightIcon} />);
    
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveClass('pl-10', 'pr-10');
  });

  it('should apply fullWidth class', () => {
    render(<Input fullWidth />);
    
    expect(screen.getByRole('textbox')).toHaveClass('w-full');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled placeholder="Disabled input" />);
    
    const input = screen.getByPlaceholderText('Disabled input');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
  });

  it('should forward ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('should have proper focus styles', () => {
    render(<Input />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('focus:outline-none', 'focus:ring-1');
    
    input.focus();
    expect(input).toHaveFocus();
  });

  it('should handle different input types', () => {
    const { rerender } = render(<Input type="email" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');

    rerender(<Input type="password" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'password');

    rerender(<Input type="number" />);
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
  });

  it('should associate label with input using htmlFor', () => {
    render(<Input label="Email Address" />);
    
    const label = screen.getByText('Email Address');
    const input = screen.getByLabelText('Email Address');
    
    expect(label).toHaveAttribute('for', input.id);
  });

  it('should generate unique IDs for multiple inputs', () => {
    render(
      <div>
        <Input label="First Input" />
        <Input label="Second Input" />
      </div>
    );
    
    const firstInput = screen.getByLabelText('First Input');
    const secondInput = screen.getByLabelText('Second Input');
    
    expect(firstInput.id).not.toBe(secondInput.id);
  });

  it('should apply custom className', () => {
    render(<Input className="custom-input-class" />);
    
    expect(screen.getByRole('textbox')).toHaveClass('custom-input-class');
  });

  it('should handle error state styling correctly', () => {
    render(<Input error="Error message" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-red-300', 'focus:border-red-500', 'focus:ring-red-500');
  });
});