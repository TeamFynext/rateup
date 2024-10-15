type PictureSource = {
  type: string;
  srcSet: string;
  media?: string;
};

type PictureProps = {
  src: string;
  alt: string;
  sourcesArr: PictureSource[];
};

function Picture({ src = "", alt = "", sourcesArr = [] }: PictureProps) {
  return (
    <picture>
      {sourcesArr.map(({ srcSet, type }) => (
        <source key={srcSet} type={type} srcSet={srcSet} />
      ))}
      <img src={src} alt={alt} loading="lazy" />
    </picture>
  );
}

export default Picture;
