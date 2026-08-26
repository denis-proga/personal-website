import avatarPhoto from '../../../assets/resume/avatar.jpg';
import './VideoAvatar.css';

// Drop your photo at: src/assets/resume/avatar.jpg
// Square crop works best — it's masked to a circle and centred on the face.
export default function VideoAvatar() {
  return (
    <div className="video-avatar">
      <img
        className="video-avatar__img"
        src={avatarPhoto}
        alt="Denis Peresunko"
        loading="eager"
        draggable="false"
      />
    </div>
  );
}
