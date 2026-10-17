import { useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { emailRules, passwordRules } from '../../features/auth/lib/authValidation.js'
import { AuthField, PasswordField } from '../../features/auth/ui/AuthFields.jsx'
import { AuthForm, DemoLink, FormSwitch } from '../../features/auth/ui/AuthForm.jsx'
import { SocialAuthButtons } from '../../features/auth/ui/SocialAuthButtons.jsx'
import styles from '../../features/auth/ui/AuthForm.module.css'

export function SignInPage() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ mode: 'onBlur' })
  const [notice, setNotice] = useState('')

  function previewSignIn() {
    reset()
    setNotice('Sign-in is not available in this preview. No credentials were verified or stored.')
  }

  return (
    <AuthForm
      title="Sign In"
      subtitle="Preview the HelmSight sign-in experience."
      onSubmit={handleSubmit(previewSignIn)}
      actionLabel="Sign In"
      notice={notice}
      onDismissNotice={() => setNotice('')}
      footer={
        <>
          <SocialAuthButtons onSelect={(provider) => setNotice(`${provider} sign-in is coming soon. No connection was made.`)} />
          <DemoLink withDivider={false} />
          <FormSwitch>Don't have an account? <Link to="/sign-up">Create one</Link></FormSwitch>
        </>
      }
    >
      <AuthField id="sign-in-email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" registration={register('email', emailRules)} error={errors.email} />
      <PasswordField id="sign-in-password" label="Password" autoComplete="current-password" registration={register('password', passwordRules)} error={errors.password} />
      <p className={styles.formMeta}><Link to="/forgot-password">Forgot password?</Link></p>
    </AuthForm>
  )
}
