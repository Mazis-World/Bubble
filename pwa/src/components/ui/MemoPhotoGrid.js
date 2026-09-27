import React from 'react';
import { X } from 'lucide-react';
import { MAX_STATUS_PHOTOS } from '../../services/memoMedia';

export const memoPhotoLayout = (count) => {
  if (count <= 1) return 'single';
  if (count === 2) return 'pair';
  if (count === 3) return 'triple';
  return 'quad';
};

const RemoveButton = ({ onRemove, disabled, label }) => (
  <button
    type="button"
    onClick={(event) => {
      event.stopPropagation();
      onRemove();
    }}
    disabled={disabled}
    className="absolute top-1 right-1 z-10 p-1 rounded-full bg-black/70 text-white tap-target disabled:opacity-50"
    aria-label={label}
  >
    <X size={14} />
  </button>
);

const FillImage = ({ url, alt, className }) => (
  <img src={url} alt={alt} className={className} />
);

const MemoPhotoGrid = ({
  urls = [],
  onClick,
  onRemove,
  disabled = false,
  preview = false,
}) => {
  const photos = (Array.isArray(urls) ? urls : []).filter(Boolean).slice(0, MAX_STATUS_PHOTOS);
  if (!photos.length) return null;
  const layout = memoPhotoLayout(photos.length);
  const altFor = (index) => (
    preview
      ? `Photo ${index + 1} preview`
      : (index === 0 ? 'Attached to this status update' : `Attached photo ${index + 1}`)
  );
  const removeLabel = (index) => `Remove photo ${index + 1}`;

  const wrap = (index, image, extraClass = '') => {
    const inner = onClick ? (
      <button type="button" onClick={onClick} className="block w-full h-full">
        {image}
      </button>
    ) : image;
    return (
      <div className={`relative overflow-hidden bg-gray-900 border border-white/10 ${extraClass}`}>
        {inner}
        {onRemove && (
          <RemoveButton
            onRemove={() => onRemove(index)}
            disabled={disabled}
            label={removeLabel(index)}
          />
        )}
      </div>
    );
  };

  if (layout === 'single') {
    return wrap(
      0,
      <FillImage
        url={photos[0]}
        alt={altFor(0)}
        className="w-full max-h-48 object-cover"
      />,
      preview ? 'rounded-2xl' : 'rounded-xl'
    );
  }

  if (layout === 'pair') {
    return (
      <div className="grid grid-cols-2 gap-1.5" data-photo-layout="pair">
        {photos.map((url, index) => (
          <div key={`${url}-${index}`} className="relative aspect-square">
            {wrap(
              index,
              <FillImage url={url} alt={altFor(index)} className="absolute inset-0 w-full h-full object-cover" />,
              'absolute inset-0 rounded-xl'
            )}
          </div>
        ))}
      </div>
    );
  }

  if (layout === 'triple') {
    return (
      <div className="grid grid-cols-2 grid-rows-2 gap-1.5 aspect-[4/3]" data-photo-layout="triple">
        <div className="relative row-span-2 min-h-0">
          {wrap(
            0,
            <FillImage url={photos[0]} alt={altFor(0)} className="absolute inset-0 w-full h-full object-cover" />,
            'absolute inset-0 rounded-xl'
          )}
        </div>
        <div className="relative min-h-0">
          {wrap(
            1,
            <FillImage url={photos[1]} alt={altFor(1)} className="absolute inset-0 w-full h-full object-cover" />,
            'absolute inset-0 rounded-xl'
          )}
        </div>
        <div className="relative min-h-0">
          {wrap(
            2,
            <FillImage url={photos[2]} alt={altFor(2)} className="absolute inset-0 w-full h-full object-cover" />,
            'absolute inset-0 rounded-xl'
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-1.5" data-photo-layout="quad">
      {photos.slice(0, 4).map((url, index) => (
        <div key={`${url}-${index}`} className="relative aspect-square">
          {wrap(
            index,
            <FillImage url={url} alt={altFor(index)} className="absolute inset-0 w-full h-full object-cover" />,
            'absolute inset-0 rounded-xl'
          )}
        </div>
      ))}
    </div>
  );
};

export default MemoPhotoGrid;
