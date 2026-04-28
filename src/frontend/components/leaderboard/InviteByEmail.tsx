interface InviteByEmailProps {
  inviteEmail: string;
  searchTerm: string;
  onEmailChange: (value: string) => void;
  onDraftInvite: () => void;
  onUseSearchText: () => void;
}

export function InviteByEmail({
  inviteEmail,
  searchTerm,
  onEmailChange,
  onDraftInvite,
  onUseSearchText,
}: InviteByEmailProps) {
  return (
    <div className="rounded-3xl border border-plum/10 bg-white p-4 dark:border-white/10 dark:bg-white/10">
      <label className="grid gap-2 text-sm font-black text-plum dark:text-cream">
        Invite by email
        <input
          className="rounded-2xl border-2 border-plum/10 bg-white px-4 py-3 text-ink dark:bg-white/10 dark:text-cream"
          value={inviteEmail}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="friend@example.com"
          type="email"
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="focus-ring rounded-2xl bg-plum px-4 py-3 text-sm font-black text-white"
          onClick={onDraftInvite}
        >
          Draft email invite
        </button>
        <button
          className="focus-ring rounded-2xl border border-plum/10 px-4 py-3 text-sm font-black text-plum dark:border-white/10 dark:text-cream"
          onClick={() => onEmailChange(searchTerm.trim())}
          // onUseSearchText is accessed through callback to keep the API clean
        >
          Use search text
        </button>
      </div>
    </div>
  );
}
