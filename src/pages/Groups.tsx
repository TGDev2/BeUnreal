import React, { useEffect, useState } from 'react';
import {
    IonAlert,
    IonButton,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonPage,
    IonSpinner,
    IonTitle,
    IonToast,
    IonToolbar,
    type AlertInput,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { addMembers, createGroup, getUserGroups, Group } from '../services/groupService';
import { getContacts } from '../services/contactService';
import { UserProfile } from '../services/userService';

const Groups: React.FC = () => {
    const { session } = useAuth();
    const uid = session!.user.id;
    const history = useHistory();

    const [groups, setGroups] = useState<Group[]>([]);
    const [contacts, setContacts] = useState<UserProfile[]>([]);
    const [busy, setBusy] = useState(true);
    const [toast, setToast] = useState<string>();
    const [showCreate, setShowCreate] = useState(false);

    // Chargement initial des groupes et contacts
    useEffect(() => {
        const load = async () => {
            try {
                const [g, c] = await Promise.all([getUserGroups(uid), getContacts(uid)]);
                setGroups(g);
                setContacts(c);
            } catch (e: any) {
                setToast(e.message);
            } finally {
                setBusy(false);
            }
        };
        load();
    }, [uid]);

    // Rafraîchir la liste des groupes
    const refreshGroups = async () => {
        try {
            setGroups(await getUserGroups(uid));
        } catch (e: any) {
            setToast(e.message);
        }
    };

    // Préparer les inputs pour l'alerte
    const contactInputs: AlertInput[] = contacts.map((c) => ({
        name: 'contacts',
        type: 'checkbox',
        label: c.username ?? c.email ?? 'Unnamed user',
        value: c.id,
    }));

    const alertInputs: AlertInput[] = [
        { name: 'groupName', type: 'text', placeholder: 'Group name' },
        ...contactInputs,
    ];

    // Gestion de la création depuis l'alerte
    const handleCreate = async (e: CustomEvent) => {
        const { role, data } = e.detail as {
            role: string;
            data: { values: Record<string, any> };
        };
        if (role !== 'confirm') return;

        const values = data.values;
        const name = (values.groupName ?? '').trim();
        const memberIds: string[] = Array.isArray(values.contacts)
            ? values.contacts
            : [];

        if (!name) {
            setToast('Group name required');
            return;
        }

        try {
            setBusy(true);
            const group = await createGroup(name);
            if (group && memberIds.length) {
                await addMembers(group.id, memberIds);
            }
            await refreshGroups();
            history.push(`/group/${group.id}`);
        } catch (err: any) {
            setToast(err.message);
        } finally {
            setBusy(false);
            setShowCreate(false);
        }
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Groups</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding">
                {busy && <IonSpinner name="dots" />}

                {!busy && (
                    <>
                        <IonList>
                            {groups.map((g) => (
                                <IonItem key={g.id} routerLink={`/group/${g.id}`}>
                                    <IonLabel>{g.name}</IonLabel>
                                </IonItem>
                            ))}
                            {groups.length === 0 && (
                                <IonItem lines="none">
                                    <IonLabel className="ion-text-center">
                                        You don’t belong to any group yet.
                                    </IonLabel>
                                </IonItem>
                            )}
                        </IonList>

                        <IonButton expand="block" className="ion-margin-top" onClick={() => setShowCreate(true)}>
                            New Group
                        </IonButton>
                    </>
                )}

                <IonAlert
                    isOpen={showCreate}
                    header="Create new group"
                    inputs={alertInputs}
                    buttons={[
                        { text: 'Cancel', role: 'cancel' },
                        { text: 'Create', role: 'confirm' },
                    ]}
                    onDidDismiss={handleCreate}
                />

                <IonToast
                    isOpen={!!toast}
                    message={toast}
                    duration={2500}
                    onDidDismiss={() => setToast(undefined)}
                />
            </IonContent>
        </IonPage>
    );
};

export default Groups;
