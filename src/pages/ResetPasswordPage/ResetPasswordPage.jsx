import { useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { passwordRules, confirmPasswordRules } from '../../features/auth/lib/authValidation.js'
import { PasswordField } from '../../features/auth/ui/AuthFields.jsx'
import { AuthForm, DemoLink, FormSwitch } from '../../features/auth/ui/AuthForm.jsx'

export function ResetPasswordPage() {
  const { register, handleSubmit, reset, getValues, formState: { errors } } = useForm({ mode: 'onBlur' })
  const [notice, setNotice] = useState('')

  function previewReset() {
    reset()
    setNotice('Password reset is not available in this preview. No password was changed.')
  }

  return (
    <AuthForm
      title="Reset Password"
      subtitle="This is a demonstration form. No reset link or account is verified."
      onSubmit={handleSubmit(previewReset)}
      actionLabel="Preview Password Reset"
      notice={notice}
      onDismissNotice={() => setNotice('')}
      footer={
        <>
          <DemoLink />
          <FormSwitch><Link to="/sign-in">Back to Sign In</Link></FormSwitch>
        </>
      }
    >
      <PasswordField id="reset-password" label="New password" autoComplete="new-password" registration={register('password', passwordRules)} error={errors.password} />
      <PasswordField id="reset-confirm" label="Confirm new password" autoComplete="new-password" registration={register('confirmPassword', confirmPasswordRules(getValues))} error={errors.confirmPassword} />
    </AuthForm>
  )
}
