import { useProfile } from "../lib/hooks";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { Skeleton } from "../components/ui/Skeleton";
import { ErrorState } from "../components/ui/ErrorState";

export default function Profile() {
  const profile = useProfile();

  if (profile.status === "loading" || profile.status === "idle") {
    return (
      <Card className="profile">
        <div className="profile__head">
          <span className="skeleton" style={{ width: 88, height: 88, borderRadius: "50%" }} />
          <div className="profile__head-text">
            <Skeleton style={{ width: 180, height: 24 }} />
            <Skeleton style={{ width: 220, height: 12 }} />
          </div>
        </div>
        <div className="profile__details">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="profile__row">
              <Skeleton style={{ width: 110, height: 12 }} />
              <Skeleton style={{ width: 160, height: 12 }} />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (profile.status === "error") {
    return (
      <ErrorState
        title="Couldn't load your profile"
        code={profile.error.status}
        message={profile.error.message}
        onRetry={() => profile.refetch()}
      />
    );
  }

  const user = profile.data;

  return (
    <Card className="profile">
      <div className="profile__head">
        {user.image ? (
          <img src={user.image} alt={user.username} className="profile__avatar" />
        ) : (
          <span className="profile__avatar profile__avatar--fallback">
            <Icon name="user" size={36} />
          </span>
        )}
        <div className="profile__head-text">
          <h1 className="profile__name">
            {user.firstName} {user.lastName}
          </h1>
          <p className="profile__username">@{user.username}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => profile.refetch()}>
          Refresh
        </Button>
      </div>

      <dl className="profile__details">
        <div className="profile__row">
          <dt className="profile__label">Email</dt>
          <dd className="profile__value">{user.email}</dd>
        </div>
        <div className="profile__row">
          <dt className="profile__label">First name</dt>
          <dd className="profile__value">{user.firstName}</dd>
        </div>
        <div className="profile__row">
          <dt className="profile__label">Last name</dt>
          <dd className="profile__value">{user.lastName}</dd>
        </div>
        <div className="profile__row">
          <dt className="profile__label">Gender</dt>
          <dd className="profile__value">{user.gender}</dd>
        </div>
      </dl>
    </Card>
  );
}
