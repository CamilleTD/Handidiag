"""Administration des contenus éditoriaux : pages « S'informer » et ressources."""

from fastapi import APIRouter, Depends, HTTPException, status
from tortoise.transactions import in_transaction

from app.auth import current_admin
from app.models import ContentPage, Resource, ResourceSection
from app.schemas import ContentPageIn, ContentPageOut, ReorderIn, ResourceIn, ResourceOut
from app.services import conflict, invalid

router = APIRouter(prefix="/admin", tags=["contenus"], dependencies=[Depends(current_admin)])


async def get_or_404[M: Resource | ContentPage](model: type[M], item_id: int) -> M:
    item = await model.get_or_none(id=item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Élément introuvable")
    return item


async def reorder(items: list, ids: list[int]) -> None:
    if sorted(ids) != sorted(item.id for item in items):
        raise invalid("La liste doit contenir chaque élément une seule fois.")
    async with in_transaction():
        for position, item_id in enumerate(ids):
            await type(items[0]).filter(id=item_id).update(position=position)


# =========================================================================== ressources


@router.get("/resources", response_model=list[ResourceOut])
async def list_resources():
    return await Resource.all()


@router.post("/resources", response_model=ResourceOut, status_code=status.HTTP_201_CREATED)
async def create_resource(body: ResourceIn):
    if await Resource.exists(section=body.section, key=body.key):
        raise conflict(f"La clé « {body.key} » existe déjà dans cette rubrique.")
    last = await Resource.filter(section=body.section).order_by("-position").first()
    return await Resource.create(
        **body.model_dump(mode="json"), position=last.position + 1 if last else 0
    )


@router.put("/resources/{item_id}", response_model=ResourceOut)
async def update_resource(item_id: int, body: ResourceIn):
    resource = await get_or_404(Resource, item_id)
    if (resource.section, resource.key) != (body.section, body.key):
        raise conflict("La rubrique et la clé ne peuvent pas être modifiées.")
    await resource.update_from_dict(body.model_dump(mode="json")).save()
    return resource


@router.delete("/resources/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource(item_id: int):
    await (await get_or_404(Resource, item_id)).delete()


@router.post("/resources/reorder/{section}", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_resources(section: ResourceSection, body: ReorderIn):
    await reorder(await Resource.filter(section=section), body.ids)


# =========================================================================== pages


@router.get("/pages", response_model=list[ContentPageOut])
async def list_pages():
    return await ContentPage.all()


@router.post("/pages", response_model=ContentPageOut, status_code=status.HTTP_201_CREATED)
async def create_page(body: ContentPageIn):
    if await ContentPage.exists(slug=body.slug):
        raise conflict(f"L'adresse « {body.slug} » est déjà utilisée.")
    last = await ContentPage.all().order_by("-position").first()
    return await ContentPage.create(
        **body.model_dump(mode="json"), position=last.position + 1 if last else 0
    )


@router.put("/pages/{item_id}", response_model=ContentPageOut)
async def update_page(item_id: int, body: ContentPageIn):
    page = await get_or_404(ContentPage, item_id)
    if body.slug != page.slug and await ContentPage.exists(slug=body.slug):
        raise conflict(f"L'adresse « {body.slug} » est déjà utilisée.")
    await page.update_from_dict(body.model_dump(mode="json")).save()
    return page


@router.delete("/pages/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_page(item_id: int):
    await (await get_or_404(ContentPage, item_id)).delete()


@router.post("/pages/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_pages(body: ReorderIn):
    await reorder(await ContentPage.all(), body.ids)
