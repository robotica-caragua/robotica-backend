export class ImageStorageStrategy {
  async upload(_image) {
    throw new Error('ImageStorageStrategy.upload deve ser implementado.')
  }
}
