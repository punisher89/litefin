import Component from '../core/Component.js';

/** Noninteractive upstream web tags on a movie's existing wide artwork. */
export default class MovieWebTags extends Component {
    constructor(container, renderer, item, ratings) {
        super({ container });
        this.renderer = renderer;
        this.item = item;
        this.ratings = ratings;
        this.mount();
    }
    render() {
        return '<div class="lf-movie-web-tags" aria-hidden="true"></div>';
    }
    onMounted() {
        this.renderer.render(this.el, this.item, this.ratings);
    }
}
