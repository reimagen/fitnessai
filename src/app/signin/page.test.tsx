import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignInPage from './page';

const pushMock = vi.fn();
const signInWithEmailMock = vi.fn();
const signUpWithEmailMock = vi.fn();
const sendPasswordResetMock = vi.fn();
const toastMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/lib/auth.service', () => ({
  useAuth: () => ({
    signInWithEmail: signInWithEmailMock,
    signUpWithEmail: signUpWithEmailMock,
    sendPasswordReset: sendPasswordResetMock,
  }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

describe('SignInPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sign-in defaults', () => {
    render(<SignInPage />);

    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('toggles to sign-up mode', async () => {
    const user = userEvent.setup();
    render(<SignInPage />);

    await user.click(screen.getByRole('button', { name: 'Sign Up' }));

    expect(screen.getByRole('heading', { name: 'Create an Account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign Up' })).toBeInTheDocument();
  });

  it('shows reset password form', async () => {
    const user = userEvent.setup();
    render(<SignInPage />);

    await user.click(screen.getByRole('button', { name: 'Forgot Password?' }));

    expect(screen.getByRole('heading', { name: 'Reset Your Password' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send Reset Email' })).toBeInTheDocument();
  });

  it('submits sign in and redirects to home', async () => {
    const user = userEvent.setup();
    signInWithEmailMock.mockResolvedValue(undefined);

    render(<SignInPage />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(signInWithEmailMock).toHaveBeenCalledWith('test@example.com', 'secret123');
    expect(pushMock).toHaveBeenCalledWith('/');
  });
});
