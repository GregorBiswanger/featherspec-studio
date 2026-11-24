import { AREAS } from '../shared/protocol/areas';
import { NAVIGATION_LABEL } from '../shared/protocol/texts';
import { AreaIcon } from './board/icons';
import { showList } from './detail/listFirst';
import { useShell } from './shell';

export function Navigation() {
    const shell = useShell();
    return (
        <nav aria-label={NAVIGATION_LABEL} className="navigation">
            <ul>
                {AREAS.map((area) => {
                    const current = area.id === shell.area;
                    return (
                        <li key={area.id}>
                            <button
                                type="button"
                                className={current ? 'nav-item current' : 'nav-item'}
                                aria-current={current ? 'page' : undefined}
                                onClick={() => {
                                    showList();
                                    shell.navigate({ area: area.id });
                                }}
                            >
                                <AreaIcon area={area.id} />
                                {area.title}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
