import { useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { emailRules, fullNameRules, passwordRules, confirmPasswordRules } from '../../features/auth/lib/authValidation.js'
import { AuthField, PasswordField } from '../../features/auth/ui/AuthFields.jsx'
import { AuthForm, DemoLink, FormSwitch } from '../../features/auth/ui/AuthForm.jsx'
import { SocialAuthButtons } from '../../features/auth/ui/SocialAuthButtons.jsx'

export function SignUpPage() {
  const { register, handleSubmit, reset, getValues, formState: { errors } } = useForm({ mode: 'onBlur' })
  const [notice, setNotice] = useState('')

  function previewRegistration() {
    reset()
    setNotice('Account creation is not available in this preview. No account was created or credentials stored.')
  }

  return (
    <AuthForm
      title="Create Account"
      subtitle="See how joining HelmSight will work."
      onSubmit={handleSubmit(previewRegistration)}
      actionLabel="Create Account"
      notice={notice}
      onDismissNotice={() => setNotice('')}
      footer={
        <>
          <SocialAuthButtons onSelect={(provider) => setNotice(`${provider} sign-up is coming soon. No connection was made.`)} />
          <DemoLink withDivider={false} />
          <FormSwitch>Already have an account? <Link to="/sign-in">Sign in</Link></FormSwitch>
        </>
      }
    >
      <AuthField id="sign-up-name" label="Full name" autoComplete="name" placeholder="Your name" registration={register('name', fullNameRules)} error={errors.name} />
      <AuthField id="sign-up-email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" registration={register('email', emailRules)} error={errors.email} />
      <PasswordField id="sign-up-password" label="Password" autoComplete="new-password" registration={register('password', passwordRules)} error={errors.password} />
      <PasswordField id="sign-up-confirm" label="Confirm password" autoComplete="new-password" registration={register('confirmPassword', confirmPasswordRules(getValues))} error={errors.confirmPassword} />
    </AuthForm>
  )
}
